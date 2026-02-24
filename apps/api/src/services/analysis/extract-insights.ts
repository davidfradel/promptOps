import { createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { askClaude } from '../../utils/claude.js';
import { logger } from '../../utils/logger.js';
import { claudeInsightSchema, competitorInsightSchema } from '@promptops/shared';

const combinedResponseSchema = z.object({
  insights: z.array(claudeInsightSchema),
  competitors: z.array(competitorInsightSchema),
});

export async function extractInsightsAndCompetitors(projectId: string): Promise<void> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

  const sources = await prisma.source.findMany({ where: { projectId } });
  const sourceIds = sources.map((s) => s.id);

  if (sourceIds.length === 0) {
    logger.warn({ projectId }, 'No sources found for project');
    return;
  }

  // Load top 200 posts by score, then filter down to 50
  let posts = await prisma.rawPost.findMany({
    where: { sourceId: { in: sourceIds } },
    orderBy: { score: 'desc' },
    take: 200,
  });

  // Apply keyword filter if project has keywords
  if (project.keywords.length > 0) {
    const keywords = project.keywords.map((k) => k.toLowerCase());
    const filtered = posts.filter((p) => {
      const text = `${p.title ?? ''} ${p.body ?? ''}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    });
    // Only apply filter if it preserves at least 10 posts (enough signal)
    if (filtered.length >= 10) {
      posts = filtered;
    }
  }

  // Keep top 50 for cost efficiency
  posts = posts.slice(0, 50);

  if (posts.length === 0) {
    logger.warn({ projectId }, 'No posts found for analysis');
    return;
  }

  // Redis cache: skip Claude call if we already analyzed these exact posts recently
  const postIds = posts.map((p) => p.id).join(',');
  const hash = createHash('sha256').update(postIds).digest('hex');
  const cacheKey = `analysis:${projectId}:${hash}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    logger.info({ projectId }, 'Analysis cache hit — skipping Claude call');
    return;
  }

  const postSummaries = posts.map((p) => ({
    id: p.id,
    title: p.title ?? '',
    body: (p.body ?? '').slice(0, 1500),
    score: p.score ?? 0,
    platform: p.platform,
  }));

  const systemPrompt = `You are a product research and competitive intelligence analyst. Analyze the following community posts for the project described below.

Project Context:
- Name: ${project.name}
- Niche: ${project.niche ?? 'General'}
- Keywords: ${project.keywords.join(', ')}

Return a JSON object with exactly two keys:

1. "insights": array of general product insights. Each item:
   - type: one of PAIN_POINT, FEATURE_REQUEST, TREND, SENTIMENT
   - title: concise title (max 100 chars)
   - description: detailed description (2-3 sentences)
   - severity: 0-1 scale (1 = most severe/important)
   - confidence: 0-1 scale (1 = most confident)
   - tags: array of relevant tags (lowercase, max 5)
   - sourcePostIds: array of post IDs that support this insight

2. "competitors": array of competitor mentions. Each item:
   - type: always "COMPETITOR"
   - title: competitor name
   - description: brief overview (2-3 sentences)
   - severity: threat level 0-1 (1 = highest threat)
   - confidence: 0-1 confidence score
   - tags: relevant tags (lowercase, max 5)
   - sourcePostIds: post IDs that mention this competitor
   - metadata: { competitorName: string, strengths: string[], weaknesses: string[], marketPosition: string, threatLevel: "LOW"|"MEDIUM"|"HIGH" }

Return ONLY the JSON object, no markdown fences or other text.`;

  const userPrompt = `Analyze these ${posts.length} community posts:\n\n${JSON.stringify(postSummaries, null, 2)}`;

  logger.info(
    { projectId, postCount: posts.length },
    'Extracting insights + competitors (1 combined call)',
  );

  const result = await askClaude(systemPrompt, userPrompt, {
    temperature: 0.3,
    maxTokens: 8192,
  });

  let parsed: z.infer<typeof combinedResponseSchema>;
  try {
    const cleaned = result
      .replace(/```(?:json)?\n?/g, '')
      .replace(/```\s*$/g, '')
      .trim();
    parsed = combinedResponseSchema.parse(JSON.parse(cleaned));
  } catch (err) {
    logger.error(
      { err, result: result.slice(0, 500) },
      'Failed to parse combined analysis response',
    );
    throw new Error('Failed to parse combined insights/competitors response');
  }

  // Load existing insights for deduplication
  const existingInsights = await prisma.insight.findMany({
    where: { projectId },
    select: { id: true, title: true, type: true, severity: true, confidence: true },
  });

  // Helper: save or merge a single insight
  async function saveOrMergeInsight(insightData: {
    type: string;
    title: string;
    description: string;
    severity: number;
    confidence: number;
    tags: string[];
    sourcePostIds: string[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const titleKey = insightData.title.toLowerCase().slice(0, 30);
    const duplicate = existingInsights.find(
      (e) => e.type === insightData.type && e.title.toLowerCase().includes(titleKey),
    );

    const validPostIds = insightData.sourcePostIds.filter((id) => posts.some((p) => p.id === id));

    if (duplicate) {
      // Merge: average scores
      await prisma.insight.update({
        where: { id: duplicate.id },
        data: {
          severity: Math.round((duplicate.severity + insightData.severity) / 2),
          confidence: (duplicate.confidence + insightData.confidence) / 2,
        },
      });
      for (const rawPostId of validPostIds) {
        await prisma.insightSource.upsert({
          where: { insightId_rawPostId: { insightId: duplicate.id, rawPostId } },
          update: {},
          create: { insightId: duplicate.id, rawPostId, relevanceScore: insightData.confidence },
        });
      }
      return;
    }

    const created = await prisma.insight.create({
      data: {
        projectId,
        type: insightData.type as never,
        title: insightData.title,
        description: insightData.description,
        severity: Math.round(insightData.severity),
        confidence: insightData.confidence,
        tags: insightData.tags,
        metadata: (insightData.metadata ?? {}) as never,
      },
    });

    for (const rawPostId of validPostIds) {
      await prisma.insightSource.create({
        data: { insightId: created.id, rawPostId, relevanceScore: insightData.confidence },
      });
    }
  }

  for (const insight of parsed.insights) {
    await saveOrMergeInsight(insight);
  }

  for (const comp of parsed.competitors) {
    await saveOrMergeInsight({
      ...comp,
      metadata: comp.metadata as Record<string, unknown>,
    });
  }

  // Cache for 6 hours to avoid re-analyzing the same posts
  await redis.setex(cacheKey, 6 * 3600, '1');

  logger.info(
    { projectId, insightCount: parsed.insights.length, competitorCount: parsed.competitors.length },
    'Combined insights extraction completed',
  );
}
