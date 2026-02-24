import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/redis.js', () => ({
  redis: {},
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    scrapeJob: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    source: {
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    project: { findMany: vi.fn() },
    rawPost: { count: vi.fn() },
  },
}));

vi.mock('../scraper/reddit.js', () => ({
  scrapeReddit: vi.fn(),
}));

vi.mock('../scraper/hackernews.js', () => ({
  scrapeHackerNews: vi.fn(),
}));

vi.mock('../scraper/producthunt.js', () => ({
  scrapeProductHunt: vi.fn(),
}));

vi.mock('../scraper/github.js', () => ({
  scrapeGitHub: vi.fn(),
}));

vi.mock('../analysis/extract-insights.js', () => ({
  extractInsightsAndCompetitors: vi.fn(),
}));

vi.mock('../analysis/prioritization.js', () => ({
  prioritizeInsights: vi.fn(),
}));

vi.mock('../generation/spec-generator.js', () => ({
  generateSpec: vi.fn(),
}));

vi.mock('./jobs.js', () => ({
  enqueueScrapeJob: vi.fn(),
  enqueueAnalyzeJob: vi.fn(),
  jobQueue: { add: vi.fn() },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock bullmq Worker to capture the processor function
let capturedProcessor: ((job: unknown) => Promise<void>) | null = null;
vi.mock('bullmq', () => {
  const MockWorker = vi.fn(function (
    this: { on: ReturnType<typeof vi.fn> },
    _name: string,
    processor: (job: unknown) => Promise<void>,
  ) {
    capturedProcessor = processor;
    this.on = vi.fn();
  });
  return { Worker: MockWorker };
});

import { createWorker } from './worker.js';
import { prisma } from '../../lib/prisma.js';
import { scrapeReddit } from '../scraper/reddit.js';
import { scrapeHackerNews } from '../scraper/hackernews.js';
import { scrapeProductHunt } from '../scraper/producthunt.js';
import { scrapeGitHub } from '../scraper/github.js';
import { extractInsightsAndCompetitors } from '../analysis/extract-insights.js';
import { prioritizeInsights } from '../analysis/prioritization.js';
import { generateSpec } from '../generation/spec-generator.js';
import { enqueueScrapeJob, enqueueAnalyzeJob } from './jobs.js';

describe('worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProcessor = null;
    createWorker();
  });

  it('should route scrape jobs to Reddit scraper', async () => {
    vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue({
      id: 'job-1',
      status: 'PENDING',
    } as never);
    vi.mocked(prisma.scrapeJob.update).mockResolvedValue({} as never);
    vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
      id: 'src-1',
      platform: 'REDDIT',
    } as never);
    vi.mocked(scrapeReddit).mockResolvedValue(10);

    await capturedProcessor!({ name: 'scrape', id: 'q1', data: { sourceId: 'src-1' } });

    expect(scrapeReddit).toHaveBeenCalledWith('src-1');
  });

  it('should route scrape jobs to HN scraper', async () => {
    vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue({
      id: 'job-1',
      status: 'PENDING',
    } as never);
    vi.mocked(prisma.scrapeJob.update).mockResolvedValue({} as never);
    vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
      id: 'src-1',
      platform: 'HACKERNEWS',
    } as never);
    vi.mocked(scrapeHackerNews).mockResolvedValue(5);

    await capturedProcessor!({ name: 'scrape', id: 'q1', data: { sourceId: 'src-1' } });

    expect(scrapeHackerNews).toHaveBeenCalledWith('src-1');
  });

  it('should run analysis pipeline sequentially', async () => {
    const callOrder: string[] = [];
    vi.mocked(extractInsightsAndCompetitors).mockImplementation(async () => {
      callOrder.push('extractInsights');
    });
    vi.mocked(prioritizeInsights).mockImplementation(async () => {
      callOrder.push('prioritize');
    });

    await capturedProcessor!({ name: 'analyze', id: 'q2', data: { projectId: 'proj-1' } });

    expect(callOrder).toEqual(['extractInsights', 'prioritize']);
  });

  it('should route generate jobs to spec generator', async () => {
    await capturedProcessor!({
      name: 'generate',
      id: 'q3',
      data: { projectId: 'proj-1', specId: 'spec-1' },
    });

    expect(generateSpec).toHaveBeenCalledWith('proj-1', 'spec-1');
  });

  it('should throw on unknown job type', async () => {
    await expect(capturedProcessor!({ name: 'unknown', id: 'q4', data: {} })).rejects.toThrow(
      'Unknown job type: unknown',
    );
  });

  it('should mark scrape job as FAILED on error', async () => {
    vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue({
      id: 'job-1',
      status: 'PENDING',
    } as never);
    vi.mocked(prisma.scrapeJob.update).mockResolvedValue({} as never);
    vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
      id: 'src-1',
      platform: 'REDDIT',
    } as never);
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

  it('should route scrape jobs to ProductHunt scraper', async () => {
    vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue({
      id: 'job-1',
      status: 'PENDING',
    } as never);
    vi.mocked(prisma.scrapeJob.update).mockResolvedValue({} as never);
    vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
      id: 'src-1',
      platform: 'PRODUCTHUNT',
    } as never);
    vi.mocked(scrapeProductHunt).mockResolvedValue(8);

    await capturedProcessor!({ name: 'scrape', id: 'q6', data: { sourceId: 'src-1' } });

    expect(scrapeProductHunt).toHaveBeenCalledWith('src-1');
  });

  it('should route scrape jobs to GitHub scraper', async () => {
    vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue({
      id: 'job-1',
      status: 'PENDING',
    } as never);
    vi.mocked(prisma.scrapeJob.update).mockResolvedValue({} as never);
    vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
      id: 'src-1',
      platform: 'GITHUB',
    } as never);
    vi.mocked(scrapeGitHub).mockResolvedValue(15);

    await capturedProcessor!({ name: 'scrape', id: 'q7', data: { sourceId: 'src-1' } });

    expect(scrapeGitHub).toHaveBeenCalledWith('src-1');
  });

  describe('scrape-all job', () => {
    it('enqueues all auto-generated project sources', async () => {
      // ensureGitHubSources: no projects with keywords missing a github source
      vi.mocked(prisma.project.findMany).mockResolvedValueOnce([]);
      // source.findMany for enqueuing
      vi.mocked(prisma.source.findMany).mockResolvedValueOnce([
        { id: 'src-a' },
        { id: 'src-b' },
      ] as never);
      vi.mocked(prisma.scrapeJob.create).mockResolvedValue({} as never);

      await capturedProcessor!({ name: 'scrape-all', id: 'q8', data: {} });

      expect(enqueueScrapeJob).toHaveBeenCalledTimes(2);
      expect(enqueueScrapeJob).toHaveBeenCalledWith('src-a');
      expect(enqueueScrapeJob).toHaveBeenCalledWith('src-b');
    });

    it('auto-creates GitHub source for projects with keywords but none yet', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValueOnce([
        { id: 'proj-1', keywords: ['SaaS', 'productivity'], sources: [] },
      ] as never);
      vi.mocked(prisma.source.create).mockResolvedValue({} as never);
      // After ensureGitHubSources, source.findMany for enqueuing
      vi.mocked(prisma.source.findMany).mockResolvedValueOnce([]);

      await capturedProcessor!({ name: 'scrape-all', id: 'q9', data: {} });

      expect(prisma.source.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'proj-1',
            platform: 'GITHUB',
            url: expect.stringContaining('SaaS'),
          }),
        }),
      );
    });

    it('skips GitHub auto-creation for projects with no keywords', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValueOnce([
        { id: 'proj-2', keywords: [], sources: [] },
      ] as never);
      vi.mocked(prisma.source.findMany).mockResolvedValueOnce([]);

      await capturedProcessor!({ name: 'scrape-all', id: 'q10', data: {} });

      expect(prisma.source.create).not.toHaveBeenCalled();
    });
  });

  describe('analyze-new job', () => {
    it('enqueues analysis when enough new posts exist', async () => {
      const lastInsight = new Date('2025-01-01');
      const latestPost = new Date('2025-01-02');
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        {
          id: 'proj-1',
          insights: [{ createdAt: lastInsight }],
          sources: [{ id: 'src-1', rawPosts: [{ createdAt: latestPost }] }],
        },
      ] as never);
      vi.mocked(prisma.rawPost.count).mockResolvedValue(25);

      await capturedProcessor!({ name: 'analyze-new', id: 'q11', data: {} });

      expect(enqueueAnalyzeJob).toHaveBeenCalledWith('proj-1');
    });

    it('skips analysis when too few new posts', async () => {
      const lastInsight = new Date('2025-01-01');
      const latestPost = new Date('2025-01-02');
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        {
          id: 'proj-1',
          insights: [{ createdAt: lastInsight }],
          sources: [{ id: 'src-1', rawPosts: [{ createdAt: latestPost }] }],
        },
      ] as never);
      vi.mocked(prisma.rawPost.count).mockResolvedValue(5); // < 20

      await capturedProcessor!({ name: 'analyze-new', id: 'q12', data: {} });

      expect(enqueueAnalyzeJob).not.toHaveBeenCalled();
    });

    it('skips projects with no posts newer than last insight', async () => {
      const lastInsight = new Date('2025-01-02');
      const latestPost = new Date('2025-01-01'); // older than last insight
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        {
          id: 'proj-1',
          insights: [{ createdAt: lastInsight }],
          sources: [{ id: 'src-1', rawPosts: [{ createdAt: latestPost }] }],
        },
      ] as never);

      await capturedProcessor!({ name: 'analyze-new', id: 'q13', data: {} });

      expect(enqueueAnalyzeJob).not.toHaveBeenCalled();
      expect(prisma.rawPost.count).not.toHaveBeenCalled();
    });
  });
});
