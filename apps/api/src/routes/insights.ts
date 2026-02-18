import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/response.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { insightQuerySchema, updateInsightSchema, cuidParamSchema } from '@promptops/shared';

export const insightsRouter = Router();

insightsRouter.get('/', async (req, res) => {
  const { cursor, limit, projectId, type, minSeverity, tag } = insightQuerySchema.parse(req.query);

  const where = {
    project: { userId: req.userId },
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
  const { id } = cuidParamSchema.parse(req.params);

  const insight = await prisma.insight.findFirst({
    where: { id, project: { userId: req.userId } },
    include: { insightSources: { include: { rawPost: true } } },
  });

  if (!insight) throw new NotFoundError('Insight', id);
  sendSuccess(res, insight);
});

insightsRouter.patch('/:id', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const result = updateInsightSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const existing = await prisma.insight.findFirst({
    where: { id, project: { userId: req.userId } },
  });
  if (!existing) throw new NotFoundError('Insight', id);

  const insight = await prisma.insight.update({
    where: { id: existing.id },
    data: result.data,
  });

  sendSuccess(res, insight);
});

insightsRouter.delete('/:id', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const existing = await prisma.insight.findFirst({
    where: { id, project: { userId: req.userId } },
  });
  if (!existing) throw new NotFoundError('Insight', id);

  await prisma.insight.delete({ where: { id: existing.id } });
  sendSuccess(res, { deleted: true });
});
