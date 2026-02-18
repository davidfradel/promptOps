import { z } from 'zod';
import { SpecFormatSchema } from './enums.js';
import { paginationSchema } from './api.js';

export const createSpecSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(500),
  content: z.string(),
  format: SpecFormatSchema.default('MARKDOWN'),
});

export const generateSpecSchema = z.object({
  projectId: z.string(),
  format: SpecFormatSchema.default('MARKDOWN'),
  title: z.string().optional(),
});

export const specPaginationSchema = paginationSchema.extend({
  projectId: z.string().optional(),
});
