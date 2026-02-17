import { Queue } from 'bullmq';
import { redis } from '../../lib/redis.js';

export const jobQueue = new Queue('promptops', { connection: redis as never });

export async function enqueueScrapeJob(sourceId: string): Promise<string> {
  const job = await jobQueue.add('scrape', { sourceId });
  return job.id ?? '';
}

export async function enqueueAnalyzeJob(projectId: string): Promise<string> {
  const job = await jobQueue.add('analyze', { projectId });
  return job.id ?? '';
}

export async function enqueueGenerateJob(projectId: string, specId: string): Promise<string> {
  const job = await jobQueue.add('generate', { projectId, specId });
  return job.id ?? '';
}
