import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { askClaude } from '../../utils/claude.js';
import { logger } from '../../utils/logger.js';
import { claudeInsightSchema } from '@promptops/shared';

export async function extractPainPoints(projectId: string): Promise<void> {
  const sources = await prisma.source.findMany({ where: { projectId } });
  const sourceIds = sources.map((s) => s.id);

  if (sourceIds.length === 0) {
    logger.warn({ projectId }, 'No sources found for project');
    return;
  }

  // Load top 200 posts by score
  const posts = await prisma.rawPost.findMany({
    where: { sourceId: { in: sourceIds } },
    orderBy: { score: 'desc' },
    take: 200,
  });

  if (posts.length === 0) {
    logger.warn({ projectId }, 'No posts found for analysis');
    return;
  }

  // Truncate bodies to 500 chars for context window efficiency
  const postSummaries = posts.map((p) => ({
    id: p.id,
    title: p.title ?? '',
    body: (p.body ?? '').slice(0, 500),
    score: p.score ?? 0,
    platform: p.platform,
  }));

  const systemPrompt = `You are a product research analyst. Analyze the following community posts and identify key insights.
Categorize each insight as one of: PAIN_POINT, FEATURE_REQUEST, TREND, SENTIMENT.

Return a JSON array of insights. Each insight should have:
- type: one of PAIN_POINT, FEATURE_REQUEST, TREND, SENTIMENT
- title: concise title (max 100 chars)
- description: detailed description (2-3 sentences)
- severity: 0-1 scale (1 = most severe/important)
- confidence: 0-1 scale (1 = most confident)
- tags: array of relevant tags (lowercase, max 5)
- sourcePostIds: array of post IDs that support this insight

Return ONLY the JSON array, no markdown fences or other text.`;

  const userPrompt = `Analyze these ${posts.length} community posts:\n\n${JSON.stringify(postSummaries, null, 2)}`;

  logger.info({ projectId, postCount: posts.length }, 'Extracting pain points');

  const result = await askClaude(systemPrompt, userPrompt, {
    temperature: 0.3,
    maxTokens: 8192,
  });

  // Parse and validate response
  let insights: z.infer<typeof claudeInsightSchema>[];
  try {
    const cleaned = result
      .replace(/```(?:json)?\n?/g, '')
      .replace(/```\s*$/g, '')
      .trim();
    insights = z.array(claudeInsightSchema).parse(JSON.parse(cleaned));
  } catch (err) {
    logger.error({ err, result: result.slice(0, 500) }, 'Failed to parse Claude response');
    throw new Error('Failed to parse pain points analysis response');
  }

  // Create Insight + InsightSource records
  for (const insight of insights) {
    const created = await prisma.insight.create({
      data: {
        projectId,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        severity: insight.severity,
        confidence: insight.confidence,
        tags: insight.tags,
        metadata: {},
      },
    });

    // Link to source posts
    const validPostIds = insight.sourcePostIds.filter((id) => posts.some((p) => p.id === id));

    for (const rawPostId of validPostIds) {
      await prisma.insightSource.create({
        data: {
          insightId: created.id,
          rawPostId,
          relevanceScore: insight.confidence,
        },
      });
    }
  }

  logger.info({ projectId, insightCount: insights.length }, 'Pain points extraction completed');
}
