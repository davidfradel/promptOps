import { jobQueue } from './queue/jobs.js';
import { logger } from '../utils/logger.js';

export async function startScheduler(): Promise<void> {
  // Scrape all auto-generated sources every 12 hours
  await jobQueue.add(
    'scrape-all',
    {},
    {
      repeat: { every: 12 * 60 * 60 * 1000 },
      jobId: 'scrape-all-recurring',
    },
  );

  // Analyze projects with new posts every 12 hours
  await jobQueue.add(
    'analyze-new',
    {},
    {
      repeat: { every: 12 * 60 * 60 * 1000 },
      jobId: 'analyze-new-recurring',
    },
  );

  logger.info('Scheduler started: scrape-all every 12h, analyze-new every 12h');
}
