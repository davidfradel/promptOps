import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/index.js';

export const cuidParamSchema = z.object({
  id: z.string().min(1),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
  details: z.record(z.unknown()).optional(),
});

export const apiMetaSchema = z.object({
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number().optional(),
});

export function apiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    error: apiErrorSchema.nullable(),
    meta: apiMetaSchema.nullable(),
  });
}
