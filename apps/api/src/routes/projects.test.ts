import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    project: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../lib/auth.js', () => ({
  verifyToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
}));

vi.mock('../services/queue/jobs.js', () => ({
  enqueueAnalyzeJob: vi.fn().mockResolvedValue('job-1'),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import { enqueueAnalyzeJob } from '../services/queue/jobs.js';
import { projectsRouter } from './projects.js';
import { authMiddleware } from '../middleware/auth.js';
import { errorHandler } from '../middleware/error-handler.js';
import { mockUser, mockProject, authHeaders, request } from '../test/helpers.js';

function createAuthTestApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use('/', projectsRouter);
  app.use(errorHandler);
  return app;
}

describe('projects routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
    app = createAuthTestApp();
  });

  describe('GET /', () => {
    it('should return paginated projects', async () => {
      const projects = [mockProject(), mockProject({ id: 'project-2', name: 'Second' })];
      vi.mocked(prisma.project.findMany).mockResolvedValue(projects);

      const res = await request(app, 'GET', '/', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ hasMore: false });
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app, 'GET', '/');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /', () => {
    it('should create a project and return 201', async () => {
      const created = mockProject({ name: 'New Project' });
      vi.mocked(prisma.project.create).mockResolvedValue(created);

      const res = await request(
        app,
        'POST',
        '/',
        { name: 'New Project', keywords: ['ai'] },
        authHeaders(),
      );

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'New Project' });
      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'New Project', userId: 'user-1' }),
        }),
      );
    });

    it('should reject invalid body', async () => {
      const res = await request(app, 'POST', '/', {}, authHeaders());

      expect(res.status).toBe(400);
    });
  });

  describe('GET /:id', () => {
    it('should return project with sources and counts', async () => {
      const project = {
        ...mockProject(),
        sources: [],
        _count: { insights: 5, specs: 2 },
      };
      vi.mocked(prisma.project.findFirst).mockResolvedValue(project as never);

      const res = await request(app, 'GET', '/project-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: 'project-1' });
    });

    it('should return 404 for nonexistent project', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

      const res = await request(app, 'GET', '/nonexistent', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /:id', () => {
    it('should update a project', async () => {
      const existing = mockProject();
      const updated = mockProject({ name: 'Updated' });
      vi.mocked(prisma.project.findFirst).mockResolvedValue(existing);
      vi.mocked(prisma.project.update).mockResolvedValue(updated);

      const res = await request(app, 'PATCH', '/project-1', { name: 'Updated' }, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'Updated' });
    });

    it('should return 404 when updating nonexistent project', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

      const res = await request(app, 'PATCH', '/nonexistent', { name: 'Updated' }, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a project', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject());
      vi.mocked(prisma.project.delete).mockResolvedValue(mockProject());

      const res = await request(app, 'DELETE', '/project-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ deleted: true });
    });

    it('should return 404 when deleting nonexistent project', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

      const res = await request(app, 'DELETE', '/nonexistent', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('POST /:id/analyze', () => {
    it('should enqueue an analyze job', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject());

      const res = await request(app, 'POST', '/project-1/analyze', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ jobId: 'job-1', status: 'QUEUED' });
      expect(enqueueAnalyzeJob).toHaveBeenCalledWith('project-1');
    });

    it('should return 404 for nonexistent project', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

      const res = await request(app, 'POST', '/nonexistent/analyze', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });
});
