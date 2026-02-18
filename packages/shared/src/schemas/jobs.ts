import { z } from 'zod';

export const scrapeJobDataSchema = z.object({
  sourceId: z.string(),
});

export const analyzeJobDataSchema = z.object({
  projectId: z.string(),
});

export const generateJobDataSchema = z.object({
  projectId: z.string(),
  specId: z.string(),
});
