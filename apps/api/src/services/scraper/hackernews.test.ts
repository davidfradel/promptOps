import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeHackerNews } from './hackernews.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    source: {
      findUniqueOrThrow: vi.fn(),
    },
    rawPost: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../../lib/prisma.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('scrapeHackerNews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.rawPost.upsert).mockResolvedValue({} as never);
  });

  describe('feed mode', () => {
    it('should fetch top stories from Firebase API', async () => {
      vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
        id: 'source-1',
        projectId: 'proj-1',
        platform: 'HACKERNEWS',
        url: 'topstories',
        config: { limit: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // First call: story IDs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([101, 102, 103]),
      });
      // Item fetches
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 101, title: 'Story 1', by: 'user1', score: 100, time: 1700000000, type: 'story' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 102, title: 'Story 2', by: 'user2', score: 50, time: 1700000001, type: 'story' }),
      });

      const count = await scrapeHackerNews('source-1');

      expect(count).toBe(2);
      expect(prisma.rawPost.upsert).toHaveBeenCalledTimes(2);
    });

    it('should skip comment-type items', async () => {
      vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
        id: 'source-1',
        projectId: 'proj-1',
        platform: 'HACKERNEWS',
        url: 'topstories',
        config: { limit: 5 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([201]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 201, type: 'comment', text: 'a comment', by: 'user1' }),
      });

      const count = await scrapeHackerNews('source-1');

      expect(count).toBe(0);
      expect(prisma.rawPost.upsert).not.toHaveBeenCalled();
    });
  });

  describe('search mode', () => {
    it('should use Algolia API for search queries', async () => {
      vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
        id: 'source-1',
        projectId: 'proj-1',
        platform: 'HACKERNEWS',
        url: 'react framework',
        config: { limit: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          hits: [
            { objectID: 'a1', title: 'React 19', author: 'user1', points: 200, created_at: '2024-01-01T00:00:00Z', num_comments: 50, _tags: ['story'] },
            { objectID: 'a2', title: 'Next.js 15', author: 'user2', points: 150, created_at: '2024-01-02T00:00:00Z', num_comments: 30, _tags: ['story'] },
          ],
          nbHits: 2,
          page: 0,
          nbPages: 1,
        }),
      });

      const count = await scrapeHackerNews('source-1');

      expect(count).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('hn.algolia.com'));
    });
  });
});
