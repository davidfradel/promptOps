import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@promptops/shared';
import { enqueueAnalyzeJob } from '../services/queue/jobs.js';

export const projectsRouter = Router();

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  niche: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

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
  const project = await prisma.project.findFirst({
    where: { id: req.params['id'], userId: req.userId },
    include: { sources: true, _count: { select: { insights: true, specs: true } } },
  });

  if (!project) throw new NotFoundError('Project', req.params['id']!);

  sendSuccess(res, project);
});

projectsRouter.post('/', async (req, res) => {
  const result = createProjectSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const project = await prisma.project.create({ data: { ...result.data, userId: req.userId! } });
  sendCreated(res, project);
});

projectsRouter.patch('/:id', async (req, res) => {
  const result = updateProjectSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const existing = await prisma.project.findFirst({
    where: { id: req.params['id'], userId: req.userId },
  });
  if (!existing) throw new NotFoundError('Project', req.params['id']!);

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: result.data,
  });

  sendSuccess(res, project);
});

projectsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.project.findFirst({
    where: { id: req.params['id'], userId: req.userId },
  });
  if (!existing) throw new NotFoundError('Project', req.params['id']!);

  await prisma.project.delete({ where: { id: existing.id } });
  sendSuccess(res, { deleted: true });
});

projectsRouter.post('/:id/analyze', async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params['id'], userId: req.userId },
  });
  if (!project) throw new NotFoundError('Project', req.params['id']!);

  const jobId = await enqueueAnalyzeJob(project.id);

  sendSuccess(res, { jobId, projectId: project.id, status: 'QUEUED' });
});
