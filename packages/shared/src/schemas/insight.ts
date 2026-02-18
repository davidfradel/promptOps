import { z } from 'zod';
import { InsightTypeSchema } from './enums.js';
import { paginationSchema } from './api.js';

export const insightQuerySchema = paginationSchema.extend({
  projectId: z.string().optional(),
  type: InsightTypeSchema.optional(),
  minSeverity: z.coerce.number().optional(),
  tag: z.string().optional(),
});

export const updateInsightSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  severity: z.number().min(0).optional(),
  confidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
});
