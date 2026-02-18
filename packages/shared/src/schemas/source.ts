import { z } from 'zod';
import { PlatformSchema } from './enums.js';
import { paginationSchema } from './api.js';

export const createSourceSchema = z.object({
  projectId: z.string(),
  platform: PlatformSchema,
  url: z.string().url(),
  config: z.record(z.unknown()).optional(),
});

export const sourcePaginationSchema = paginationSchema.extend({
  projectId: z.string().optional(),
});
