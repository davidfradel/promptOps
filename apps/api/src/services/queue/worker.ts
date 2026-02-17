import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { redis } from '../../lib/redis.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import { scrapeReddit } from '../scraper/reddit.js';
import { scrapeHackerNews } from '../scraper/hackernews.js';
import { extractPainPoints } from '../analysis/pain-points.js';
import { analyzeCompetition } from '../analysis/competition.js';
import { prioritizeInsights } from '../analysis/prioritization.js';
import { generateSpec } from '../generation/spec-generator.js';

async function handleScrape(job: Job): Promise<void> {
  const { sourceId } = job.data as { sourceId: string };

  // Update ScrapeJob status to RUNNING
  const scrapeJob = await prisma.scrapeJob.findFirst({
    where: { sourceId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  if (scrapeJob) {
    await prisma.scrapeJob.update({
      where: { id: scrapeJob.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
  }

  try {
    const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });

    let postsFound: number;
    switch (source.platform) {
      case 'REDDIT':
        postsFound = await scrapeReddit(sourceId);
        break;
      case 'HACKERNEWS':
        postsFound = await scrapeHackerNews(sourceId);
        break;
      default:
        throw new Error(`Unsupported platform: ${source.platform}`);
    }

    if (scrapeJob) {
      await prisma.scrapeJob.update({
        where: { id: scrapeJob.id },
        data: { status: 'COMPLETED', completedAt: new Date(), postsFound },
      });
    }
  } catch (err) {
    if (scrapeJob) {
      await prisma.scrapeJob.update({
        where: { id: scrapeJob.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    }
    throw err;
  }
}

async function handleAnalyze(job: Job): Promise<void> {
  const { projectId } = job.data as { projectId: string };

  // Run sequentially: pain points → competition → prioritization
  await extractPainPoints(projectId);
  await analyzeCompetition(projectId);
  await prioritizeInsights(projectId);
}

async function handleGenerate(job: Job): Promise<void> {
  const { projectId, specId } = job.data as { projectId: string; specId: string };
  await generateSpec(projectId, specId);
}

export function createWorker(): Worker {
  const worker = new Worker(
    'promptops',
    async (job) => {
      logger.info({ jobName: job.name, jobId: job.id, data: job.data }, 'Processing job');

      switch (job.name) {
        case 'scrape':
          await handleScrape(job);
          break;
        case 'analyze':
          await handleAnalyze(job);
          break;
        case 'generate':
          await handleGenerate(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    { connection: redis as never, concurrency: 3 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Job failed');
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
  });

  return worker;
}
