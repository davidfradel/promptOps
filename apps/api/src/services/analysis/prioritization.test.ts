import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prioritizeInsights } from './prioritization.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    insight: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
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

describe('prioritizeInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prioritize insights and update them', async () => {
    const insights = [
      {
        id: 'ins-1',
        projectId: 'proj-1',
        type: 'PAIN_POINT',
        title: 'Auth Issues',
        description: 'Login fails',
        severity: 0.5,
        confidence: 0.6,
        tags: ['auth'],
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        insightSources: [{ id: 'is-1', rawPost: { id: 'post-1' } }],
      },
    ];
    vi.mocked(prisma.insight.findMany).mockResolvedValue(insights as never);

    vi.mocked(askClaude).mockResolvedValue(
      JSON.stringify([
        {
          insightId: 'ins-1',
          severity: 0.9,
          confidence: 0.85,
          reasoning: 'High impact issue affecting many users.',
        },
      ]),
    );

    vi.mocked(prisma.insight.update).mockResolvedValue({} as never);

    await prioritizeInsights('proj-1');

    expect(askClaude).toHaveBeenCalledOnce();
    expect(askClaude).toHaveBeenCalledWith(
      expect.stringContaining('prioritization expert'),
      expect.stringContaining('ins-1'),
      expect.objectContaining({ temperature: 0.2, maxTokens: 4096 }),
    );
    expect(prisma.insight.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ins-1' },
        data: expect.objectContaining({
          severity: 0.9,
          confidence: 0.85,
        }),
      }),
    );
  });

  it('should handle markdown-fenced responses', async () => {
    const insights = [
      {
        id: 'ins-1',
        projectId: 'proj-1',
        type: 'PAIN_POINT',
        title: 'Test',
        description: 'desc',
        severity: 0.5,
        confidence: 0.5,
        tags: [],
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        insightSources: [],
      },
    ];
    vi.mocked(prisma.insight.findMany).mockResolvedValue(insights as never);

    vi.mocked(askClaude).mockResolvedValue(
      '```json\n[{"insightId":"ins-1","severity":0.8,"confidence":0.7,"reasoning":"Important issue"}]\n```',
    );
    vi.mocked(prisma.insight.update).mockResolvedValue({} as never);

    await prioritizeInsights('proj-1');

    expect(prisma.insight.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ins-1' },
        data: expect.objectContaining({ severity: 0.8, confidence: 0.7 }),
      }),
    );
  });

  it('should return early when no insights found', async () => {
    vi.mocked(prisma.insight.findMany).mockResolvedValue([]);

    await prioritizeInsights('proj-1');

    expect(askClaude).not.toHaveBeenCalled();
  });
});
