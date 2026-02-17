import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/redis.js', () => ({
  redis: {},
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    scrapeJob: { findFirst: vi.fn(), update: vi.fn() },
    source: { findUniqueOrThrow: vi.fn() },
  },
}));

vi.mock('../scraper/reddit.js', () => ({
  scrapeReddit: vi.fn(),
}));

vi.mock('../scraper/hackernews.js', () => ({
  scrapeHackerNews: vi.fn(),
}));

vi.mock('../analysis/pain-points.js', () => ({
  extractPainPoints: vi.fn(),
}));

vi.mock('../analysis/competition.js', () => ({
  analyzeCompetition: vi.fn(),
}));

vi.mock('../analysis/prioritization.js', () => ({
  prioritizeInsights: vi.fn(),
}));

vi.mock('../generation/spec-generator.js', () => ({
  generateSpec: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock bullmq Worker to capture the processor function
let capturedProcessor: ((job: unknown) => Promise<void>) | null = null;
vi.mock('bullmq', () => {
  const MockWorker = vi.fn(function (this: { on: ReturnType<typeof vi.fn> }, _name: string, processor: (job: unknown) => Promise<void>) {
    capturedProcessor = processor;
    this.on = vi.fn();
  });
  return { Worker: MockWorker };
});

import { createWorker } from './worker.js';
import { prisma } from '../../lib/prisma.js';
import { scrapeReddit } from '../scraper/reddit.js';
import { scrapeHackerNews } from '../scraper/hackernews.js';
import { extractPainPoints } from '../analysis/pain-points.js';
import { analyzeCompetition } from '../analysis/competition.js';
import { prioritizeInsights } from '../analysis/prioritization.js';
import { generateSpec } from '../generation/spec-generator.js';

describe('worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProcessor = null;
    createWorker();
  });

  it('should route scrape jobs to Reddit scraper', async () => {
    vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue({ id: 'job-1', status: 'PENDING' } as never);
    vi.mocked(prisma.scrapeJob.update).mockResolvedValue({} as never);
    vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({ id: 'src-1', platform: 'REDDIT' } as never);
    vi.mocked(scrapeReddit).mockResolvedValue(10);

    await capturedProcessor!({ name: 'scrape', id: 'q1', data: { sourceId: 'src-1' } });

    expect(scrapeReddit).toHaveBeenCalledWith('src-1');
  });

  it('should route scrape jobs to HN scraper', async () => {
    vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue({ id: 'job-1', status: 'PENDING' } as never);
    vi.mocked(prisma.scrapeJob.update).mockResolvedValue({} as never);
    vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({ id: 'src-1', platform: 'HACKERNEWS' } as never);
    vi.mocked(scrapeHackerNews).mockResolvedValue(5);

    await capturedProcessor!({ name: 'scrape', id: 'q1', data: { sourceId: 'src-1' } });

    expect(scrapeHackerNews).toHaveBeenCalledWith('src-1');
  });

  it('should run analysis pipeline sequentially', async () => {
    const callOrder: string[] = [];
    vi.mocked(extractPainPoints).mockImplementation(async () => { callOrder.push('painPoints'); });
    vi.mocked(analyzeCompetition).mockImplementation(async () => { callOrder.push('competition'); });
    vi.mocked(prioritizeInsights).mockImplementation(async () => { callOrder.push('prioritize'); });

    await capturedProcessor!({ name: 'analyze', id: 'q2', data: { projectId: 'proj-1' } });

    expect(callOrder).toEqual(['painPoints', 'competition', 'prioritize']);
  });

  it('should route generate jobs to spec generator', async () => {
    await capturedProcessor!({ name: 'generate', id: 'q3', data: { projectId: 'proj-1', specId: 'spec-1' } });

    expect(generateSpec).toHaveBeenCalledWith('proj-1', 'spec-1');
  });

  it('should throw on unknown job type', async () => {
    await expect(
      capturedProcessor!({ name: 'unknown', id: 'q4', data: {} }),
    ).rejects.toThrow('Unknown job type: unknown');
  });

  it('should mark scrape job as FAILED on error', async () => {
    vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue({ id: 'job-1', status: 'PENDING' } as never);
    vi.mocked(prisma.scrapeJob.update).mockResolvedValue({} as never);
    vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({ id: 'src-1', platform: 'REDDIT' } as never);
    vi.mocked(scrapeReddit).mockRejectedValue(new Error('API down'));

    await expect(
      capturedProcessor!({ name: 'scrape', id: 'q5', data: { sourceId: 'src-1' } }),
    ).rejects.toThrow('API down');

    expect(prisma.scrapeJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'FAILED', error: 'API down' }),
      }),
    );
  });
});
