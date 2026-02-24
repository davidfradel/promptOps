import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    userInterest: { findMany: vi.fn() },
    insight: { findMany: vi.fn() },
  },
}));

vi.mock('../lib/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  },
}));

vi.mock('../lib/auth.js', () => ({
  verifyToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import { discoverRouter } from './discover.js';
import { authMiddleware } from '../middleware/auth.js';
import { errorHandler } from '../middleware/error-handler.js';
import { mockUser, mockInsight, authHeaders, request } from '../test/helpers.js';

function createAuthTestApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use('/', discoverRouter);
  app.use(errorHandler);
  return app;
}

describe('discover routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
    app = createAuthTestApp();
  });

  describe('GET /', () => {
    it('should return insights for user interests', async () => {
      vi.mocked(prisma.userInterest.findMany).mockResolvedValue([
        { id: 'int-1', userId: 'user-1', category: 'SAAS', createdAt: new Date() },
      ] as never);

      const insight = {
        ...mockInsight(),
        project: { name: 'SAAS Discovery', category: 'SAAS' },
        savedBy: [],
      };
      vi.mocked(prisma.insight.findMany).mockResolvedValue([insight] as never);

      const res = await request(app, 'GET', '/', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({ hasMore: false });
    });

    it('should return empty when user has no interests', async () => {
      vi.mocked(prisma.userInterest.findMany).mockResolvedValue([]);

      const res = await request(app, 'GET', '/', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toMatchObject({ hasMore: false });
    });

    it('should filter by category', async () => {
      vi.mocked(prisma.userInterest.findMany).mockResolvedValue([
        { id: 'int-1', userId: 'user-1', category: 'SAAS', createdAt: new Date() },
        { id: 'int-2', userId: 'user-1', category: 'DEVTOOLS', createdAt: new Date() },
      ] as never);
      vi.mocked(prisma.insight.findMany).mockResolvedValue([]);

      const res = await request(app, 'GET', '/?category=SAAS', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project: expect.objectContaining({ category: 'SAAS' }),
          }),
        }),
      );
    });

    it('should filter by type', async () => {
      vi.mocked(prisma.userInterest.findMany).mockResolvedValue([
        { id: 'int-1', userId: 'user-1', category: 'SAAS', createdAt: new Date() },
      ] as never);
      vi.mocked(prisma.insight.findMany).mockResolvedValue([]);

      const res = await request(app, 'GET', '/?type=PAIN_POINT', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'PAIN_POINT' }),
        }),
      );
    });
  });
});
