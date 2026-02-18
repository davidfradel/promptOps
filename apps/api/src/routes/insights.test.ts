import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    insight: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../lib/auth.js', () => ({
  verifyToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import { insightsRouter } from './insights.js';
import { authMiddleware } from '../middleware/auth.js';
import { errorHandler } from '../middleware/error-handler.js';
import { mockUser, mockInsight, authHeaders, request } from '../test/helpers.js';

function createAuthTestApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use('/', insightsRouter);
  app.use(errorHandler);
  return app;
}

describe('insights routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
    app = createAuthTestApp();
  });

  describe('GET /', () => {
    it('should return paginated insights', async () => {
      const insights = [
        { ...mockInsight(), _count: { insightSources: 3 } },
        { ...mockInsight({ id: 'insight-2' }), _count: { insightSources: 1 } },
      ];
      vi.mocked(prisma.insight.findMany).mockResolvedValue(insights as never);

      const res = await request(app, 'GET', '/', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ hasMore: false });
    });

    it('should filter by type', async () => {
      vi.mocked(prisma.insight.findMany).mockResolvedValue([]);

      const res = await request(app, 'GET', '/?type=PAIN_POINT', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'PAIN_POINT' }),
        }),
      );
    });

    it('should filter by tag', async () => {
      vi.mocked(prisma.insight.findMany).mockResolvedValue([]);

      const res = await request(app, 'GET', '/?tag=performance', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tags: { has: 'performance' } }),
        }),
      );
    });

    it('should filter by projectId', async () => {
      vi.mocked(prisma.insight.findMany).mockResolvedValue([]);

      const res = await request(app, 'GET', '/?projectId=project-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'project-1' }),
        }),
      );
    });
  });

  describe('GET /:id', () => {
    it('should return insight with sources', async () => {
      const insight = {
        ...mockInsight(),
        insightSources: [{ id: 'is-1', rawPost: { id: 'post-1', title: 'Test' } }],
      };
      vi.mocked(prisma.insight.findFirst).mockResolvedValue(insight as never);

      const res = await request(app, 'GET', '/insight-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: 'insight-1' });
    });

    it('should return 404 for nonexistent insight', async () => {
      vi.mocked(prisma.insight.findFirst).mockResolvedValue(null);

      const res = await request(app, 'GET', '/nonexistent', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /:id', () => {
    it('should update an insight', async () => {
      const existing = mockInsight();
      const updated = mockInsight({ title: 'Updated Insight' });
      vi.mocked(prisma.insight.findFirst).mockResolvedValue(existing);
      vi.mocked(prisma.insight.update).mockResolvedValue(updated);

      const res = await request(
        app,
        'PATCH',
        '/insight-1',
        { title: 'Updated Insight' },
        authHeaders(),
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ title: 'Updated Insight' });
    });

    it('should return 404 when updating nonexistent insight', async () => {
      vi.mocked(prisma.insight.findFirst).mockResolvedValue(null);

      const res = await request(app, 'PATCH', '/nonexistent', { title: 'Updated' }, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete an insight', async () => {
      vi.mocked(prisma.insight.findFirst).mockResolvedValue(mockInsight());
      vi.mocked(prisma.insight.delete).mockResolvedValue(mockInsight());

      const res = await request(app, 'DELETE', '/insight-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ deleted: true });
    });

    it('should return 404 when deleting nonexistent insight', async () => {
      vi.mocked(prisma.insight.findFirst).mockResolvedValue(null);

      const res = await request(app, 'DELETE', '/nonexistent', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });
});
