import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/response.js';
import { NotFoundError } from '../lib/errors.js';
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
