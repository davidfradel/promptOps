import { z } from 'zod';
import { CategorySchema } from './enums.js';

export const onboardingSchema = z.object({
  categories: z.array(CategorySchema).min(1, 'At least one category is required'),
});

export const updateInterestsSchema = z.object({
  add: z.array(CategorySchema).default([]),
  remove: z.array(CategorySchema).default([]),
});
