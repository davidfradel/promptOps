import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  niche: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
