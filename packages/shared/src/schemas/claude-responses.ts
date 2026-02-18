import { z } from 'zod';
import { ThreatLevelSchema } from './enums.js';

export const claudeInsightSchema = z.object({
  type: z.enum(['PAIN_POINT', 'FEATURE_REQUEST', 'TREND', 'SENTIMENT']),
  title: z.string(),
  description: z.string(),
  severity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()),
  sourcePostIds: z.array(z.string()),
});

export const competitorInsightSchema = z.object({
  type: z.literal('COMPETITOR'),
  title: z.string(),
  description: z.string(),
  severity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()),
  sourcePostIds: z.array(z.string()),
  metadata: z.object({
    competitorName: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    marketPosition: z.string(),
    threatLevel: ThreatLevelSchema,
  }),
});

export const prioritizedInsightSchema = z.object({
  insightId: z.string(),
  severity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type ClaudeInsight = z.infer<typeof claudeInsightSchema>;
export type CompetitorInsight = z.infer<typeof competitorInsightSchema>;
export type PrioritizedInsight = z.infer<typeof prioritizedInsightSchema>;
