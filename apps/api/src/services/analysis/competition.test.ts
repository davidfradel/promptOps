import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeCompetition } from './competition.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    source: { findMany: vi.fn() },
    rawPost: { findMany: vi.fn() },
    project: { findUniqueOrThrow: vi.fn() },
    insight: { create: vi.fn() },
    insightSource: { create: vi.fn() },
  },
}));

vi.mock('../../utils/claude.js', () => ({
  askClaude: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../../lib/prisma.js';
import { askClaude } from '../../utils/claude.js';

describe('analyzeCompetition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract competitors from posts using Claude', async () => {
    vi.mocked(prisma.project.findUniqueOrThrow).mockResolvedValue({
      id: 'proj-1',
      name: 'Test Project',
      niche: 'SaaS',
      keywords: ['auth'],
    } as never);

    vi.mocked(prisma.source.findMany).mockResolvedValue([
      {
        id: 'src-1',
        projectId: 'proj-1',
        platform: 'REDDIT',
        url: 'https://reddit.com/r/test',
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    vi.mocked(prisma.rawPost.findMany).mockResolvedValue([
      {
        id: 'post-1',
        sourceId: 'src-1',
        externalId: 'ext1',
        platform: 'REDDIT',
        title: 'Auth0 vs Clerk',
        body: 'Comparing auth providers',
        author: 'user1',
        url: null,
        score: 100,
        postedAt: new Date(),
        metadata: null,
        createdAt: new Date(),
      },
    ]);

    vi.mocked(askClaude).mockResolvedValue(
      JSON.stringify([
        {
          type: 'COMPETITOR',
          title: 'Auth0',
          description: 'Major auth provider with wide adoption.',
          severity: 0.7,
          confidence: 0.9,
          tags: ['auth', 'identity'],
          sourcePostIds: ['post-1'],
          metadata: {
            competitorName: 'Auth0',
            strengths: ['large ecosystem'],
            weaknesses: ['complex pricing'],
            marketPosition: 'Leader',
            threatLevel: 'HIGH',
          },
        },
      ]),
    );

    vi.mocked(prisma.insight.create).mockResolvedValue({ id: 'ins-1' } as never);
    vi.mocked(prisma.insightSource.create).mockResolvedValue({} as never);

    await analyzeCompetition('proj-1');

    expect(askClaude).toHaveBeenCalledOnce();
    expect(askClaude).toHaveBeenCalledWith(
      expect.stringContaining('competitive intelligence analyst'),
      expect.stringContaining('post-1'),
      expect.objectContaining({ temperature: 0.3, maxTokens: 8192 }),
    );
    expect(prisma.insight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'proj-1',
          type: 'COMPETITOR',
          title: 'Auth0',
        }),
      }),
    );
    expect(prisma.insightSource.create).toHaveBeenCalledOnce();
  });

  it('should handle markdown-fenced responses', async () => {
    vi.mocked(prisma.project.findUniqueOrThrow).mockResolvedValue({
      id: 'proj-1',
      name: 'Test',
      niche: null,
      keywords: ['test'],
    } as never);
    vi.mocked(prisma.source.findMany).mockResolvedValue([{ id: 'src-1' } as never]);
    vi.mocked(prisma.rawPost.findMany).mockResolvedValue([
      {
        id: 'p1',
        sourceId: 'src-1',
        title: 'Test',
        body: '',
        score: 1,
        platform: 'REDDIT',
      } as never,
    ]);

    vi.mocked(askClaude).mockResolvedValue(
      '```json\n[{"type":"COMPETITOR","title":"Rival Co","description":"A competitor","severity":0.5,"confidence":0.7,"tags":["saas"],"sourcePostIds":[],"metadata":{"competitorName":"Rival Co","strengths":[],"weaknesses":[],"marketPosition":"Challenger","threatLevel":"MEDIUM"}}]\n```',
    );
    vi.mocked(prisma.insight.create).mockResolvedValue({ id: 'ins-1' } as never);

    await analyzeCompetition('proj-1');

    expect(prisma.insight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'COMPETITOR', title: 'Rival Co' }),
      }),
    );
  });

  it('should return early if no sources found', async () => {
    vi.mocked(prisma.project.findUniqueOrThrow).mockResolvedValue({
      id: 'proj-1',
      name: 'Test',
      niche: null,
      keywords: [],
    } as never);
    vi.mocked(prisma.source.findMany).mockResolvedValue([]);

    await analyzeCompetition('proj-1');

    expect(askClaude).not.toHaveBeenCalled();
  });

  it('should return early if no posts found', async () => {
    vi.mocked(prisma.project.findUniqueOrThrow).mockResolvedValue({
      id: 'proj-1',
      name: 'Test',
      niche: null,
      keywords: [],
    } as never);
    vi.mocked(prisma.source.findMany).mockResolvedValue([{ id: 'src-1' } as never]);
    vi.mocked(prisma.rawPost.findMany).mockResolvedValue([]);

    await analyzeCompetition('proj-1');

    expect(askClaude).not.toHaveBeenCalled();
  });
});
