import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';

export const savedRouter = Router();

// List saved insights
savedRouter.get('/', async (req, res) => {
  const userId = req.userId!;

  const saved = await prisma.savedInsight.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      insight: {
        include: {
          project: { select: { name: true, category: true } },
        },
      },
    },
  });

  const result = saved.map((s) => ({
    id: s.insight.id,
    projectId: s.insight.projectId,
    type: s.insight.type,
    title: s.insight.title,
    description: s.insight.description,
    severity: s.insight.severity,
    confidence: s.insight.confidence,
    tags: s.insight.tags,
    metadata: s.insight.metadata,
    createdAt: s.insight.createdAt,
    updatedAt: s.insight.updatedAt,
    category: s.insight.project.category,
    isSaved: true,
    projectName: s.insight.project.name,
  }));

  sendSuccess(res, result);
});

// Save an insight
savedRouter.post('/:insightId', async (req, res) => {
  const userId = req.userId!;
  const { insightId } = req.params;

  // Verify insight exists and belongs to user's projects
  const insight = await prisma.insight.findFirst({
    where: { id: insightId, project: { userId } },
  });
  if (!insight) throw new NotFoundError('Insight', insightId);

  // Check if already saved
  const existing = await prisma.savedInsight.findUnique({
    where: { userId_insightId: { userId, insightId } },
  });
  if (existing) throw new ConflictError('Insight already saved');

  await prisma.savedInsight.create({
    data: { userId, insightId },
  });

  sendCreated(res, { message: 'Insight saved' });
});

// Unsave an insight
savedRouter.delete('/:insightId', async (req, res) => {
  const userId = req.userId!;
  const { insightId } = req.params;

  await prisma.savedInsight.deleteMany({
    where: { userId, insightId },
  });

  sendSuccess(res, { message: 'Insight removed from saved' });
});
