import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    spec: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: { findFirst: vi.fn() },
  },
}));

vi.mock('../lib/auth.js', () => ({
  verifyToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
}));

vi.mock('../services/queue/jobs.js', () => ({
  enqueueGenerateJob: vi.fn().mockResolvedValue('job-1'),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import { enqueueGenerateJob } from '../services/queue/jobs.js';
import { specsRouter } from './specs.js';
import { authMiddleware } from '../middleware/auth.js';
import { errorHandler } from '../middleware/error-handler.js';
import { mockUser, mockSpec, mockProject, authHeaders, request } from '../test/helpers.js';

function createAuthTestApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use('/', specsRouter);
  app.use(errorHandler);
  return app;
}

describe('specs routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
    app = createAuthTestApp();
  });

  describe('GET /', () => {
    it('should return paginated specs', async () => {
      const specs = [mockSpec(), mockSpec({ id: 'spec-2', title: 'Second Spec' })];
      vi.mocked(prisma.spec.findMany).mockResolvedValue(specs);

      const res = await request(app, 'GET', '/', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ hasMore: false });
    });

    it('should filter by projectId', async () => {
      vi.mocked(prisma.spec.findMany).mockResolvedValue([]);

      const res = await request(app, 'GET', '/?projectId=project-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(prisma.spec.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'project-1' }),
        }),
      );
    });
  });

  describe('POST /', () => {
    it('should create a spec', async () => {
      const project = mockProject();
      const spec = mockSpec();
      vi.mocked(prisma.project.findFirst).mockResolvedValue(project);
      vi.mocked(prisma.spec.create).mockResolvedValue(spec);

      const res = await request(
        app,
        'POST',
        '/',
        { projectId: 'project-1', title: 'Test Spec', content: '# Content', format: 'MARKDOWN' },
        authHeaders(),
      );

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ id: 'spec-1' });
    });

    it('should reject when project not found or not owned', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

      const res = await request(
        app,
        'POST',
        '/',
        { projectId: 'other-project', title: 'Test', content: 'content', format: 'MARKDOWN' },
        authHeaders(),
      );

      expect(res.status).toBe(401);
    });
  });

  describe('GET /:id', () => {
    it('should return spec by id', async () => {
      vi.mocked(prisma.spec.findFirst).mockResolvedValue(mockSpec());

      const res = await request(app, 'GET', '/spec-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: 'spec-1', title: 'Test Spec' });
    });

    it('should return 404 for nonexistent spec', async () => {
      vi.mocked(prisma.spec.findFirst).mockResolvedValue(null);

      const res = await request(app, 'GET', '/nonexistent', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /:id', () => {
    it('should update a spec', async () => {
      const existing = mockSpec();
      const updated = mockSpec({ title: 'Updated Title' });
      vi.mocked(prisma.spec.findFirst).mockResolvedValue(existing);
      vi.mocked(prisma.spec.update).mockResolvedValue(updated);

      const res = await request(app, 'PATCH', '/spec-1', { title: 'Updated Title' }, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ title: 'Updated Title' });
    });

    it('should return 404 when updating nonexistent spec', async () => {
      vi.mocked(prisma.spec.findFirst).mockResolvedValue(null);

      const res = await request(app, 'PATCH', '/nonexistent', { title: 'Updated' }, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a spec', async () => {
      vi.mocked(prisma.spec.findFirst).mockResolvedValue(mockSpec());
      vi.mocked(prisma.spec.delete).mockResolvedValue(mockSpec());

      const res = await request(app, 'DELETE', '/spec-1', undefined, authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ deleted: true });
    });

    it('should return 404 when deleting nonexistent spec', async () => {
      vi.mocked(prisma.spec.findFirst).mockResolvedValue(null);

      const res = await request(app, 'DELETE', '/nonexistent', undefined, authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('POST /generate', () => {
    it('should create placeholder spec and enqueue generate job', async () => {
      const project = mockProject();
      const placeholder = mockSpec({ title: 'Generating...', content: 'Generating...' });
      vi.mocked(prisma.project.findFirst).mockResolvedValue(project);
      vi.mocked(prisma.spec.create).mockResolvedValue(placeholder);

      const res = await request(
        app,
        'POST',
        '/generate',
        { projectId: 'project-1', format: 'MARKDOWN' },
        authHeaders(),
      );

      expect(res.status).toBe(201);
      expect(enqueueGenerateJob).toHaveBeenCalledWith('project-1', 'spec-1');
    });

    it('should return 404 for nonexistent project', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

      const res = await request(
        app,
        'POST',
        '/generate',
        { projectId: 'nonexistent', format: 'MARKDOWN' },
        authHeaders(),
      );

      expect(res.status).toBe(404);
    });
  });
});
