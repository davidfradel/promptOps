import { z } from 'zod';
import { SpecFormatSchema } from './enums.js';
import { paginationSchema } from './api.js';

export const createSpecSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(500),
  content: z.string(),
  format: SpecFormatSchema.default('MARKDOWN'),
});

export const generateSpecSchema = z
  .object({
    projectId: z.string().optional(),
    insightIds: z.array(z.string()).min(1).optional(),
    format: SpecFormatSchema.default('MARKDOWN'),
    title: z.string().optional(),
  })
  .refine((d) => d.projectId || (d.insightIds && d.insightIds.length > 0), {
    message: 'Either projectId or insightIds must be provided',
  });

export const specPaginationSchema = paginationSchema.extend({
  projectId: z.string().optional(),
});
