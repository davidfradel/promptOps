import { z } from 'zod';
import { CategorySchema, InsightTypeSchema } from './enums.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/index.js';

export const discoverQuerySchema = z.object({
  category: CategorySchema.optional(),
  type: InsightTypeSchema.optional(),
  minSeverity: z.coerce.number().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['recent', 'severity', 'confidence', 'relevance']).default('recent'),
  dateRange: z.enum(['7d', '30d', '90d', 'all']).default('all'),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
