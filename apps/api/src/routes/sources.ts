import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, Platform } from '@promptops/shared';
import { enqueueScrapeJob } from '../services/queue/jobs.js';

export const sourcesRouter = Router();

const createSourceSchema = z.object({
  projectId: z.string(),
  platform: z.nativeEnum(Platform),
  url: z.string().url(),
  config: z.record(z.unknown()).optional(),
});

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  projectId: z.string().optional(),
});

sourcesRouter.get('/', async (req, res) => {
  const { cursor, limit, projectId } = paginationSchema.parse(req.query);

  const sources = await prisma.source.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    ...(projectId ? { where: { projectId } } : {}),
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
  const source = await prisma.source.findUnique({
    where: { id: req.params['id'] },
    include: { _count: { select: { rawPosts: true, scrapeJobs: true } } },
  });

  if (!source) throw new NotFoundError('Source', req.params['id']!);
  sendSuccess(res, source);
});

sourcesRouter.get('/:id/jobs', async (req, res) => {
  const source = await prisma.source.findUnique({ where: { id: req.params['id'] } });
  if (!source) throw new NotFoundError('Source', req.params['id']!);

  const jobs = await prisma.scrapeJob.findMany({
    where: { sourceId: source.id },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, jobs);
});

sourcesRouter.post('/', async (req, res) => {
  const result = createSourceSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const { config, ...rest } = result.data;
  const source = await prisma.source.create({
    data: { ...rest, config: config as Prisma.InputJsonValue ?? undefined },
  });
  sendCreated(res, source);
});

sourcesRouter.delete('/:id', async (req, res) => {
  await prisma.source.delete({ where: { id: req.params['id'] } });
  sendSuccess(res, { deleted: true });
});

sourcesRouter.post('/:id/scrape', async (req, res) => {
  const source = await prisma.source.findUnique({ where: { id: req.params['id'] } });
  if (!source) throw new NotFoundError('Source', req.params['id']!);

  const job = await prisma.scrapeJob.create({
    data: { sourceId: source.id, status: 'PENDING' },
  });

  await enqueueScrapeJob(source.id);

  sendCreated(res, job);
});
