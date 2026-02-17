import { prisma } from '../../lib/prisma.js';
import { askClaude } from '../../utils/claude.js';
import { logger } from '../../utils/logger.js';

interface CompetitorInsight {
  type: 'COMPETITOR';
  title: string;
  description: string;
  severity: number;
  confidence: number;
  tags: string[];
  sourcePostIds: string[];
  metadata: {
    competitorName: string;
    strengths: string[];
    weaknesses: string[];
    marketPosition: string;
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export async function analyzeCompetition(projectId: string): Promise<void> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

  const sources = await prisma.source.findMany({ where: { projectId } });
  const sourceIds = sources.map((s) => s.id);

  if (sourceIds.length === 0) {
    logger.warn({ projectId }, 'No sources found for competition analysis');
    return;
  }

  const posts = await prisma.rawPost.findMany({
    where: { sourceId: { in: sourceIds } },
    orderBy: { score: 'desc' },
    take: 200,
  });

  if (posts.length === 0) {
    logger.warn({ projectId }, 'No posts found for competition analysis');
    return;
  }

  const postSummaries = posts.map((p) => ({
    id: p.id,
    title: p.title ?? '',
    body: (p.body ?? '').slice(0, 500),
    score: p.score ?? 0,
    platform: p.platform,
  }));

  const systemPrompt = `You are a competitive intelligence analyst. Analyze the following community posts in the context of the project described below. Identify competitors mentioned or implied in the posts.

Project Context:
- Name: ${project.name}
- Niche: ${project.niche ?? 'General'}
- Keywords: ${project.keywords.join(', ')}

For each competitor, provide:
- type: always "COMPETITOR"
- title: competitor name
- description: brief overview of the competitor (2-3 sentences)
- severity: threat level as 0-1 (1 = highest threat)
- confidence: 0-1 how confident you are about this assessment
- tags: relevant tags (lowercase, max 5)
- sourcePostIds: post IDs that mention this competitor
- metadata: object with competitorName, strengths (array), weaknesses (array), marketPosition (string), threatLevel (LOW/MEDIUM/HIGH)

Return ONLY a JSON array of competitor insights, no markdown fences.`;

  const userPrompt = `Analyze these ${posts.length} community posts for competitive intelligence:\n\n${JSON.stringify(postSummaries, null, 2)}`;

  logger.info({ projectId, postCount: posts.length }, 'Analyzing competition');

  const result = await askClaude(systemPrompt, userPrompt, {
    temperature: 0.3,
    maxTokens: 8192,
  });

  let competitors: CompetitorInsight[];
  try {
    const cleaned = result.replace(/```(?:json)?\n?/g, '').replace(/```\s*$/g, '').trim();
    competitors = JSON.parse(cleaned) as CompetitorInsight[];
  } catch (err) {
    logger.error({ err, result: result.slice(0, 500) }, 'Failed to parse competition analysis');
    throw new Error('Failed to parse competition analysis response');
  }

  for (const comp of competitors) {
    const created = await prisma.insight.create({
      data: {
        projectId,
        type: 'COMPETITOR',
        title: comp.title,
        description: comp.description,
        severity: comp.severity,
        confidence: comp.confidence,
        tags: comp.tags,
        metadata: comp.metadata ?? {},
      },
    });

    const validPostIds = comp.sourcePostIds.filter((id) =>
      posts.some((p) => p.id === id),
    );

    for (const rawPostId of validPostIds) {
      await prisma.insightSource.create({
        data: {
          insightId: created.id,
          rawPostId,
          relevanceScore: comp.confidence,
        },
      });
    }
  }

  logger.info({ projectId, competitorCount: competitors.length }, 'Competition analysis completed');
}
