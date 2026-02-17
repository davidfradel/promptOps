import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractPainPoints } from './pain-points.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    source: { findMany: vi.fn() },
    rawPost: { findMany: vi.fn() },
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

describe('extractPainPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract insights from posts using Claude', async () => {
    vi.mocked(prisma.source.findMany).mockResolvedValue([
      { id: 'src-1', projectId: 'proj-1', platform: 'REDDIT', url: 'https://reddit.com/r/test', config: null, createdAt: new Date(), updatedAt: new Date() },
    ]);

    vi.mocked(prisma.rawPost.findMany).mockResolvedValue([
      { id: 'post-1', sourceId: 'src-1', externalId: 'ext1', platform: 'REDDIT', title: 'Auth is broken', body: 'Login fails constantly', author: 'user1', url: null, score: 100, postedAt: new Date(), metadata: null, createdAt: new Date() },
    ]);

    vi.mocked(askClaude).mockResolvedValue(JSON.stringify([
      {
        type: 'PAIN_POINT',
        title: 'Authentication Issues',
        description: 'Users report frequent login failures.',
        severity: 0.8,
        confidence: 0.9,
        tags: ['auth', 'login'],
        sourcePostIds: ['post-1'],
      },
    ]));

    vi.mocked(prisma.insight.create).mockResolvedValue({ id: 'ins-1' } as never);
    vi.mocked(prisma.insightSource.create).mockResolvedValue({} as never);

    await extractPainPoints('proj-1');

    expect(askClaude).toHaveBeenCalledOnce();
    expect(askClaude).toHaveBeenCalledWith(
      expect.stringContaining('product research analyst'),
      expect.stringContaining('post-1'),
      expect.objectContaining({ temperature: 0.3, maxTokens: 8192 }),
    );
    expect(prisma.insight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'proj-1',
          type: 'PAIN_POINT',
          title: 'Authentication Issues',
        }),
      }),
    );
    expect(prisma.insightSource.create).toHaveBeenCalledOnce();
  });

  it('should handle markdown-fenced responses', async () => {
    vi.mocked(prisma.source.findMany).mockResolvedValue([{ id: 'src-1' } as never]);
    vi.mocked(prisma.rawPost.findMany).mockResolvedValue([
      { id: 'p1', sourceId: 'src-1', title: 'Test', body: '', score: 1, platform: 'REDDIT' } as never,
    ]);

    vi.mocked(askClaude).mockResolvedValue('```json\n[{"type":"TREND","title":"AI Hype","description":"desc","severity":0.5,"confidence":0.7,"tags":["ai"],"sourcePostIds":[]}]\n```');
    vi.mocked(prisma.insight.create).mockResolvedValue({ id: 'ins-1' } as never);

    await extractPainPoints('proj-1');

    expect(prisma.insight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'TREND', title: 'AI Hype' }),
      }),
    );
  });

  it('should return early if no sources found', async () => {
    vi.mocked(prisma.source.findMany).mockResolvedValue([]);

    await extractPainPoints('proj-1');

    expect(askClaude).not.toHaveBeenCalled();
  });

  it('should return early if no posts found', async () => {
    vi.mocked(prisma.source.findMany).mockResolvedValue([{ id: 'src-1' } as never]);
    vi.mocked(prisma.rawPost.findMany).mockResolvedValue([]);

    await extractPainPoints('proj-1');

    expect(askClaude).not.toHaveBeenCalled();
  });
});
