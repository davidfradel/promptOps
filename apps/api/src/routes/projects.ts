import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createProjectSchema,
  updateProjectSchema,
  paginationSchema,
  cuidParamSchema,
} from '@promptops/shared';
import { enqueueAnalyzeJob } from '../services/queue/jobs.js';

export const projectsRouter = Router();

projectsRouter.get('/', async (req, res) => {
  const { cursor, limit } = paginationSchema.parse(req.query);

  const projects = await prisma.project.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = projects.length > limit;
  if (hasMore) projects.pop();

  sendSuccess(res, projects, {
    cursor: projects.at(-1)?.id ?? null,
    hasMore,
  });
});

projectsRouter.get('/:id', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const project = await prisma.project.findFirst({
    where: { id, userId: req.userId },
    include: { sources: true, _count: { select: { insights: true, specs: true } } },
  });

  if (!project) throw new NotFoundError('Project', id);

  sendSuccess(res, project);
});

projectsRouter.post('/', async (req, res) => {
  const result = createProjectSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const project = await prisma.project.create({ data: { ...result.data, userId: req.userId! } });
  sendCreated(res, project);
});

projectsRouter.patch('/:id', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const result = updateProjectSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const existing = await prisma.project.findFirst({
    where: { id, userId: req.userId },
  });
  if (!existing) throw new NotFoundError('Project', id);

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: result.data,
  });

  sendSuccess(res, project);
});

projectsRouter.delete('/:id', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const existing = await prisma.project.findFirst({
    where: { id, userId: req.userId },
  });
  if (!existing) throw new NotFoundError('Project', id);

  await prisma.project.delete({ where: { id: existing.id } });
  sendSuccess(res, { deleted: true });
});

projectsRouter.post('/:id/analyze', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const project = await prisma.project.findFirst({
    where: { id, userId: req.userId },
  });
  if (!project) throw new NotFoundError('Project', id);

  const jobId = await enqueueAnalyzeJob(project.id);

  sendSuccess(res, { jobId, projectId: project.id, status: 'QUEUED' });
});
