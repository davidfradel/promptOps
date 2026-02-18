import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('../lib/auth.js', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import { verifyToken } from '../lib/auth.js';
import { authMiddleware } from './auth.js';
import { errorHandler } from './error-handler.js';
import { mockUser, request } from '../test/helpers.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.get('/test', (req, res) => {
    res.json({ data: { userId: req.userId }, error: null, meta: null });
  });
  app.use(errorHandler);
  return app;
}

describe('authMiddleware', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  it('should return 401 when authorization header is missing', async () => {
    const res = await request(app, 'GET', '/test');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('should return 401 when token format is invalid', async () => {
    const res = await request(app, 'GET', '/test', undefined, {
      Authorization: 'Basic some-token',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('should return 401 when token is expired or invalid', async () => {
    vi.mocked(verifyToken).mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const res = await request(app, 'GET', '/test', undefined, {
      Authorization: 'Bearer expired-token',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ message: 'Invalid or expired token' });
  });

  it('should return 401 when user is not found', async () => {
    vi.mocked(verifyToken).mockReturnValue({ userId: 'deleted-user' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(app, 'GET', '/test', undefined, {
      Authorization: 'Bearer valid-token',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ message: 'User not found' });
  });

  it('should set userId on request when token is valid', async () => {
    vi.mocked(verifyToken).mockReturnValue({ userId: 'user-1' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());

    const res = await request(app, 'GET', '/test', undefined, {
      Authorization: 'Bearer valid-token',
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ userId: 'user-1' });
  });
});
