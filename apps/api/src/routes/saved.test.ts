import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    savedInsight: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
    insight: { findFirst: vi.fn() },
  },
}));

vi.mock('../lib/auth.js', () => ({
  verifyToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import { savedRouter } from './saved.js';
import { authMiddleware } from '../middleware/auth.js';
import { errorHandler } from '../middleware/error-handler.js';
import { mockUser, mockInsight, authHeaders, request } from '../test/helpers.js';

function createAuthTestApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use('/', savedRouter);
  app.use(errorHandler);
  return app;
}

describe('saved routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
    app = createAuthTestApp();
  });

  describe('GET /', () => {
    it('should return saved insights', async () => {
      const savedItems = [
        {
          id: 'saved-1',
          userId: 'user-1',
          insightId: 'insight-1',
          createdAt: new Date(),
          insight: {
            ...mockInsight(),
            project: { name: 'Test Project', category: 'SAAS' },
          },
        },
      ];
      vi.mocked(prisma.savedInsight.findMany).mockResolvedValue(savedItems as never);

      const res = await request(app, 'GET', '/', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('POST /:insightId', () => {
    it('should save an insight', async () => {
      vi.mocked(prisma.insight.findFirst).mockResolvedValue(mockInsight());
      vi.mocked(prisma.savedInsight.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.savedInsight.create).mockResolvedValue({} as never);

      const res = await request(app, 'POST', '/insight-1', undefined, authHeaders());

      expect(res.status).toBe(201);
      expect(prisma.savedInsight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: 'user-1', insightId: 'insight-1' },
        }),
      );
    });

    it('should return 409 when saving a duplicate', async () => {
      vi.mocked(prisma.insight.findFirst).mockResolvedValue(mockInsight());
      vi.mocked(prisma.savedInsight.findUnique).mockResolvedValue({
        id: 'saved-1',
        userId: 'user-1',
        insightId: 'insight-1',
        createdAt: new Date(),
      } as never);

      const res = await request(app, 'POST', '/insight-1', undefined, authHeaders());

      expect(res.status).toBe(409);
    });

    it('should return 404 for nonexistent insight', async () => {
      vi.mocked(prisma.insight.findFirst).mockResolvedValue(null);

      const res = await request(app, 'POST', '/nonexistent', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:insightId', () => {
    it('should unsave an insight', async () => {
      vi.mocked(prisma.savedInsight.deleteMany).mockResolvedValue({ count: 1 } as never);

      const res = await request(app, 'DELETE', '/insight-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(prisma.savedInsight.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', insightId: 'insight-1' },
        }),
      );
    });
  });
});
