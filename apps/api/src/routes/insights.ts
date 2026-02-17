import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/response.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, InsightType, Platform } from '@promptops/shared';

export const insightsRouter = Router();

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  projectId: z.string().optional(),
  type: z.nativeEnum(InsightType).optional(),
  minSeverity: z.coerce.number().optional(),
  tag: z.string().optional(),
});

insightsRouter.get('/', async (req, res) => {
  const { cursor, limit, projectId, type, minSeverity, tag } = querySchema.parse(req.query);

  const where = {
    ...(projectId ? { projectId } : {}),
    ...(type ? { type } : {}),
    ...(minSeverity !== undefined ? { severity: { gte: minSeverity } } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const insights = await prisma.insight.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    where,
    orderBy: { severity: 'desc' },
    include: { _count: { select: { insightSources: true } } },
  });

  const hasMore = insights.length > limit;
  if (hasMore) insights.pop();

  sendSuccess(res, insights, {
    cursor: insights.at(-1)?.id ?? null,
    hasMore,
  });
});

insightsRouter.get('/:id', async (req, res) => {
  const insight = await prisma.insight.findUnique({
    where: { id: req.params['id'] },
    include: { insightSources: { include: { rawPost: true } } },
  });

  if (!insight) throw new NotFoundError('Insight', req.params['id']!);
  sendSuccess(res, insight);
});

const updateInsightSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  severity: z.number().min(0).optional(),
  confidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
});

insightsRouter.patch('/:id', async (req, res) => {
  const result = updateInsightSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const insight = await prisma.insight.update({
    where: { id: req.params['id'] },
    data: result.data,
  });

  sendSuccess(res, insight);
});

insightsRouter.delete('/:id', async (req, res) => {
  await prisma.insight.delete({ where: { id: req.params['id'] } });
  sendSuccess(res, { deleted: true });
});
