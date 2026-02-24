import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeGitHub } from './github.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    source: { findUniqueOrThrow: vi.fn() },
    rawPost: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../../lib/prisma.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeIssue(n: number, overrides: Record<string, unknown> = {}) {
  return {
    number: n,
    title: `Issue ${n}`,
    body: `Body ${n}`,
    user: { login: 'dev' },
    html_url: `https://github.com/owner/repo/issues/${n}`,
    repository_url: 'https://api.github.com/repos/owner/repo',
    comments: 3,
    reactions: { total_count: 1 },
    created_at: '2025-01-01T00:00:00Z',
    labels: [{ name: 'bug' }],
    ...overrides,
  };
}

function okResponse(body: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(body),
    headers: { get: (_key: string) => null },
  };
}

function errResponse(status: number, statusText: string) {
  return {
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({}),
    headers: { get: (_key: string) => null },
  };
}

describe('scrapeGitHub', () => {
  beforeEach(() => {
    // resetAllMocks clears the mockResolvedValueOnce queue too (unlike clearAllMocks)
    vi.resetAllMocks();
    vi.mocked(prisma.rawPost.findMany).mockResolvedValue([]);
    vi.mocked(prisma.rawPost.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.rawPost.update).mockResolvedValue({} as never);
  });

  describe('repo mode (github.com/owner/repo URL)', () => {
    beforeEach(() => {
      vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
        id: 'src-1',
        url: 'https://github.com/owner/repo',
        config: { limit: 5 },
        platform: 'GITHUB',
      } as never);
    });

    it('calls the repo issues endpoint and upserts posts', async () => {
      mockFetch.mockResolvedValueOnce(okResponse([makeIssue(1), makeIssue(2), makeIssue(3)]));

      const count = await scrapeGitHub('src-1');

      expect(count).toBe(3);
      expect(prisma.rawPost.upsert).toHaveBeenCalledTimes(3);
      const firstUrl = mockFetch.mock.calls[0]![0] as string;
      expect(firstUrl).toContain('/repos/owner/repo/issues');
    });

    it('skips pull requests', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse([makeIssue(1), makeIssue(2, { pull_request: {} }), makeIssue(3)]),
      );

      const count = await scrapeGitHub('src-1');

      expect(count).toBe(2);
      expect(prisma.rawPost.upsert).toHaveBeenCalledTimes(2);
    });

    it('respects the limit from source config', async () => {
      const issues = Array.from({ length: 20 }, (_, i) => makeIssue(i + 1));
      mockFetch.mockResolvedValueOnce(okResponse(issues));

      const count = await scrapeGitHub('src-1');

      expect(count).toBe(5);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce(errResponse(403, 'Forbidden'));

      await expect(scrapeGitHub('src-1')).rejects.toThrow('GitHub API error: 403');
    });
  });

  describe('search mode (keyword query)', () => {
    beforeEach(() => {
      vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
        id: 'src-1',
        url: 'SaaS productivity tool',
        config: { limit: 10 },
        platform: 'GITHUB',
      } as never);
    });

    it('calls the search endpoint and upserts posts', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ total_count: 2, items: [makeIssue(1), makeIssue(2)] }),
      );

      const count = await scrapeGitHub('src-1');

      expect(count).toBe(2);
      const firstUrl = mockFetch.mock.calls[0]![0] as string;
      expect(firstUrl).toContain('/search/issues');
      expect(firstUrl).toContain('SaaS');
    });

    it('skips PRs from search results', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          total_count: 2,
          items: [makeIssue(1), makeIssue(2, { pull_request: {} })],
        }),
      );

      const count = await scrapeGitHub('src-1');

      expect(count).toBe(1);
    });

    it('throws on search API error', async () => {
      mockFetch.mockResolvedValueOnce(errResponse(422, 'Unprocessable Entity'));

      await expect(scrapeGitHub('src-1')).rejects.toThrow('GitHub Search API error: 422');
    });
  });

  describe('comment enrichment', () => {
    beforeEach(() => {
      vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
        id: 'src-1',
        url: 'https://github.com/owner/repo',
        config: { limit: 5 },
        platform: 'GITHUB',
      } as never);
    });

    it('enriches issues with enough comments and no topComments yet', async () => {
      mockFetch.mockResolvedValueOnce(okResponse([makeIssue(1, { comments: 10 })]));

      // findMany returns one post eligible for enrichment
      vi.mocked(prisma.rawPost.findMany).mockResolvedValueOnce([
        {
          id: 'p1',
          score: 10,
          metadata: { comments: 10, repo: 'owner/repo', issueNumber: 1 },
        },
      ] as never);

      // Comments fetch for that issue
      mockFetch.mockResolvedValueOnce(
        okResponse([
          {
            body: 'This is a meaningful comment that is long enough to pass the filter',
            reactions: { total_count: 2 },
          },
          {
            body: 'Another useful comment that is also long enough to pass',
            reactions: { total_count: 1 },
          },
        ]),
      );

      await scrapeGitHub('src-1');

      expect(prisma.rawPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: expect.objectContaining({
            metadata: expect.objectContaining({ topComments: expect.any(Array) }),
          }),
        }),
      );
    });

    it('skips enrichment for posts already having topComments', async () => {
      mockFetch.mockResolvedValueOnce(okResponse([makeIssue(1)]));

      vi.mocked(prisma.rawPost.findMany).mockResolvedValueOnce([
        {
          id: 'p1',
          score: 10,
          metadata: { comments: 10, repo: 'owner/repo', issueNumber: 1, topComments: ['already'] },
        },
      ] as never);

      await scrapeGitHub('src-1');

      // Only 1 fetch (repo issues), no comment enrichment fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(prisma.rawPost.update).not.toHaveBeenCalled();
    });
  });
});
