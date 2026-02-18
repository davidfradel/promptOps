import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    source: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    project: { findFirst: vi.fn() },
    scrapeJob: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../lib/auth.js', () => ({
  verifyToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
}));

vi.mock('../services/queue/jobs.js', () => ({
  enqueueScrapeJob: vi.fn().mockResolvedValue('job-1'),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import { enqueueScrapeJob } from '../services/queue/jobs.js';
import { sourcesRouter } from './sources.js';
import { authMiddleware } from '../middleware/auth.js';
import { errorHandler } from '../middleware/error-handler.js';
import {
  mockUser,
  mockSource,
  mockProject,
  mockScrapeJob,
  authHeaders,
  request,
} from '../test/helpers.js';

function createAuthTestApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use('/', sourcesRouter);
  app.use(errorHandler);
  return app;
}

describe('sources routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
    app = createAuthTestApp();
  });

  describe('GET /', () => {
    it('should return paginated sources', async () => {
      const sources = [
        { ...mockSource(), _count: { rawPosts: 10 }, scrapeJobs: [mockScrapeJob()] },
      ];
      vi.mocked(prisma.source.findMany).mockResolvedValue(sources as never);

      const res = await request(app, 'GET', '/', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({ hasMore: false });
    });

    it('should filter by projectId', async () => {
      vi.mocked(prisma.source.findMany).mockResolvedValue([]);

      const res = await request(app, 'GET', '/?projectId=project-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(prisma.source.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'project-1' }),
        }),
      );
    });
  });

  describe('POST /', () => {
    it('should create a source', async () => {
      const project = mockProject();
      const source = mockSource();
      vi.mocked(prisma.project.findFirst).mockResolvedValue(project);
      vi.mocked(prisma.source.create).mockResolvedValue(source);

      const res = await request(
        app,
        'POST',
        '/',
        { projectId: 'project-1', platform: 'REDDIT', url: 'https://reddit.com/r/test' },
        authHeaders(),
      );

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ id: 'source-1' });
    });

    it('should reject when project not found or not owned', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

      const res = await request(
        app,
        'POST',
        '/',
        { projectId: 'other-project', platform: 'REDDIT', url: 'https://reddit.com/r/test' },
        authHeaders(),
      );

      expect(res.status).toBe(401);
    });

    it('should reject invalid body', async () => {
      const res = await request(app, 'POST', '/', {}, authHeaders());

      expect(res.status).toBe(400);
    });
  });

  describe('GET /:id', () => {
    it('should return source by id', async () => {
      const source = {
        ...mockSource(),
        _count: { rawPosts: 10, scrapeJobs: 2 },
      };
      vi.mocked(prisma.source.findFirst).mockResolvedValue(source as never);

      const res = await request(app, 'GET', '/source-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: 'source-1' });
    });

    it('should return 404 for nonexistent source', async () => {
      vi.mocked(prisma.source.findFirst).mockResolvedValue(null);

      const res = await request(app, 'GET', '/nonexistent', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a source', async () => {
      vi.mocked(prisma.source.findFirst).mockResolvedValue(mockSource());
      vi.mocked(prisma.source.delete).mockResolvedValue(mockSource());

      const res = await request(app, 'DELETE', '/source-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ deleted: true });
    });

    it('should return 404 when deleting nonexistent source', async () => {
      vi.mocked(prisma.source.findFirst).mockResolvedValue(null);

      const res = await request(app, 'DELETE', '/nonexistent', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('POST /:id/scrape', () => {
    it('should create a scrape job and enqueue it', async () => {
      const source = mockSource();
      const job = mockScrapeJob({ status: 'PENDING' as const, completedAt: null, postsFound: 0 });
      vi.mocked(prisma.source.findFirst).mockResolvedValue(source);
      vi.mocked(prisma.scrapeJob.create).mockResolvedValue(job);

      const res = await request(app, 'POST', '/source-1/scrape', undefined, authHeaders());

      expect(res.status).toBe(201);
      expect(enqueueScrapeJob).toHaveBeenCalledWith('source-1');
    });

    it('should return 404 for nonexistent source', async () => {
      vi.mocked(prisma.source.findFirst).mockResolvedValue(null);

      const res = await request(app, 'POST', '/nonexistent/scrape', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('GET /:id/jobs', () => {
    it('should return scrape job history', async () => {
      const source = mockSource();
      const jobs = [mockScrapeJob(), mockScrapeJob({ id: 'job-2' })];
      vi.mocked(prisma.source.findFirst).mockResolvedValue(source);
      vi.mocked(prisma.scrapeJob.findMany).mockResolvedValue(jobs);

      const res = await request(app, 'GET', '/source-1/jobs', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return 404 for nonexistent source', async () => {
      vi.mocked(prisma.source.findFirst).mockResolvedValue(null);

      const res = await request(app, 'GET', '/nonexistent/jobs', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });
});
