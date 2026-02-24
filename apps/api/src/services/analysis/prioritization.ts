import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { askClaude } from '../../utils/claude.js';
import { logger } from '../../utils/logger.js';
import { prioritizedInsightSchema } from '@promptops/shared';

export async function prioritizeInsights(projectId: string): Promise<void> {
  const insights = await prisma.insight.findMany({
    where: { projectId },
    include: { insightSources: { include: { rawPost: true } } },
  });

  if (insights.length === 0) {
    logger.warn({ projectId }, 'No insights to prioritize');
    return;
  }

  const insightSummaries = insights.map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    description: i.description,
    currentSeverity: i.severity,
    currentConfidence: i.confidence,
    tags: i.tags,
    sourceCount: i.insightSources.length,
  }));

  const systemPrompt = `You are a product strategy prioritization expert. Re-score the following insights based on these weighted criteria:
- Impact (40%): How significantly does this affect users or the business?
- Frequency (30%): How often is this mentioned or encountered?
- Actionability (20%): How easy is it to address this insight?
- Urgency (10%): How time-sensitive is this?

For each insight, return:
- insightId: the original insight ID
- severity: new severity score 0-1 (1 = highest priority)
- confidence: new confidence score 0-1
- reasoning: brief explanation of the scoring (1-2 sentences)

Return ONLY a JSON array, no markdown fences.`;

  const userPrompt = `Prioritize these ${insights.length} insights:\n\n${JSON.stringify(insightSummaries, null, 2)}`;

  logger.info({ projectId, insightCount: insights.length }, 'Prioritizing insights');

  const result = await askClaude(systemPrompt, userPrompt, {
    model: 'claude-haiku-4-5-20251001',
    temperature: 0.2,
    maxTokens: 4096,
  });

  let prioritized: z.infer<typeof prioritizedInsightSchema>[];
  try {
    const cleaned = result
      .replace(/```(?:json)?\n?/g, '')
      .replace(/```\s*$/g, '')
      .trim();
    prioritized = z.array(prioritizedInsightSchema).parse(JSON.parse(cleaned));
  } catch (err) {
    logger.error({ err, result: result.slice(0, 500) }, 'Failed to parse prioritization response');
    throw new Error('Failed to parse prioritization response');
  }

  // Update existing insight records
  for (const p of prioritized) {
    const existing = insights.find((i) => i.id === p.insightId);
    if (!existing) continue;

    await prisma.insight.update({
      where: { id: p.insightId },
      data: {
        severity: p.severity,
        confidence: p.confidence,
        metadata: {
          ...((existing.metadata as Record<string, unknown>) ?? {}),
          prioritizationReasoning: p.reasoning,
        },
      },
    });
  }

  logger.info({ projectId, updatedCount: prioritized.length }, 'Insight prioritization completed');
}
