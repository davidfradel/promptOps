import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { NotFoundError, ValidationError, AuthError } from '../lib/errors.js';
import { createSourceSchema, sourcePaginationSchema, cuidParamSchema } from '@promptops/shared';
import { enqueueScrapeJob } from '../services/queue/jobs.js';

export const sourcesRouter = Router();

sourcesRouter.get('/', async (req, res) => {
  const { cursor, limit, projectId } = sourcePaginationSchema.parse(req.query);

  const where = {
    project: { userId: req.userId },
    ...(projectId ? { projectId } : {}),
  };

  const sources = await prisma.source.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { rawPosts: true } },
      scrapeJobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const hasMore = sources.length > limit;
  if (hasMore) sources.pop();

  sendSuccess(res, sources, {
    cursor: sources.at(-1)?.id ?? null,
    hasMore,
  });
});

sourcesRouter.get('/:id', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const source = await prisma.source.findFirst({
    where: { id, project: { userId: req.userId } },
    include: { _count: { select: { rawPosts: true, scrapeJobs: true } } },
  });

  if (!source) throw new NotFoundError('Source', id);
  sendSuccess(res, source);
});

sourcesRouter.get('/:id/jobs', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const source = await prisma.source.findFirst({
    where: { id, project: { userId: req.userId } },
  });
  if (!source) throw new NotFoundError('Source', id);

  const jobs = await prisma.scrapeJob.findMany({
    where: { sourceId: source.id },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, jobs);
});

sourcesRouter.post('/', async (req, res) => {
  const result = createSourceSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const project = await prisma.project.findFirst({
    where: { id: result.data.projectId, userId: req.userId },
  });
  if (!project) throw new AuthError('Project not found or access denied');

  const { config, ...rest } = result.data;
  const source = await prisma.source.create({
    data: { ...rest, config: (config as Prisma.InputJsonValue) ?? undefined },
  });
  sendCreated(res, source);
});

sourcesRouter.delete('/:id', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const source = await prisma.source.findFirst({
    where: { id, project: { userId: req.userId } },
  });
  if (!source) throw new NotFoundError('Source', id);

  await prisma.source.delete({ where: { id: source.id } });
  sendSuccess(res, { deleted: true });
});

sourcesRouter.post('/:id/scrape', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const source = await prisma.source.findFirst({
    where: { id, project: { userId: req.userId } },
  });
  if (!source) throw new NotFoundError('Source', id);

  const job = await prisma.scrapeJob.create({
    data: { sourceId: source.id, status: 'PENDING' },
  });

  await enqueueScrapeJob(source.id);

  sendCreated(res, job);
});
