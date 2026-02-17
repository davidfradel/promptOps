import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';

// Mock dependencies before importing anything that uses them
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../lib/auth.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  comparePassword: vi.fn(),
  signToken: vi.fn().mockReturnValue('mock-jwt-token'),
  verifyToken: vi.fn(),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import { comparePassword, verifyToken } from '../lib/auth.js';
import { authRouter } from './auth.js';
import { errorHandler } from '../middleware/error-handler.js';

// Create a minimal test app with just auth routes + error handler
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRouter);
  app.use(errorHandler);
  return app;
}

// Lightweight request helper using Node http
function request(app: express.Express, method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address() as { port: number };
      const bodyStr = body ? JSON.stringify(body) : undefined;
      const opts: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        ...(bodyStr ? { body: bodyStr } : {}),
      };

      fetch(`http://127.0.0.1:${addr.port}${path}`, opts)
        .then((res) => res.json().then((json) => ({ status: res.status, body: json as Record<string, unknown> })))
        .then((result) => {
          server.close();
          resolve(result);
        });
    });
  });
}

describe('auth routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  describe('POST /register', () => {
    it('should create a user and return token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hashed-password',
        onboardedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

      const res = await request(app, 'POST', '/api/v1/auth/register', {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('token', 'mock-jwt-token');
      expect((res.body.data as Record<string, unknown>).user).toMatchObject({ email: 'test@example.com', name: 'Test' });
      expect((res.body.data as Record<string, unknown>).user).not.toHaveProperty('passwordHash');
    });

    it('should reject duplicate email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing',
        email: 'test@example.com',
        name: null,
        passwordHash: 'hash',
        onboardedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app, 'POST', '/api/v1/auth/register', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(409);
      expect((res.body.error as Record<string, unknown>).message).toContain('Email already registered');
    });

    it('should reject short password', async () => {
      const res = await request(app, 'POST', '/api/v1/auth/register', {
        email: 'test@example.com',
        password: 'short',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /login', () => {
    it('should return token for valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hashed-password',
        onboardedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(comparePassword).mockResolvedValue(true);

      const res = await request(app, 'POST', '/api/v1/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token', 'mock-jwt-token');
      expect((res.body.data as Record<string, unknown>).user).toMatchObject({ email: 'test@example.com' });
    });

    it('should reject invalid email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app, 'POST', '/api/v1/auth/login', {
        email: 'unknown@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
      expect((res.body.error as Record<string, unknown>).message).toBe('Invalid email or password');
    });

    it('should reject wrong password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: null,
        passwordHash: 'hashed-password',
        onboardedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(comparePassword).mockResolvedValue(false);

      const res = await request(app, 'POST', '/api/v1/auth/login', {
        email: 'test@example.com',
        password: 'wrong-password',
      });

      expect(res.status).toBe(401);
      expect((res.body.error as Record<string, unknown>).message).toBe('Invalid email or password');
    });
  });

  describe('GET /me', () => {
    it('should return current user with valid token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hashed-password',
        onboardedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-1' });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const res = await request(app, 'GET', '/api/v1/auth/me', undefined, {
        Authorization: 'Bearer valid-token',
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ email: 'test@example.com', name: 'Test' });
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('should reject request without token', async () => {
      const res = await request(app, 'GET', '/api/v1/auth/me');

      expect(res.status).toBe(401);
    });
  });
});
