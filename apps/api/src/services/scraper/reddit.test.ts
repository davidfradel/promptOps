import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeReddit } from './reddit.js';

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

function redditListing(posts: Array<{ id: string; title: string }>, after: string | null = null) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        data: {
          children: posts.map((p) => ({
            kind: 't3',
            data: {
              id: p.id,
              title: p.title,
              selftext: 'body text',
              author: 'user1',
              permalink: `/r/test/comments/${p.id}/`,
              score: 42,
              created_utc: 1700000000,
              num_comments: 5,
              url: `https://reddit.com/r/test/${p.id}`,
              subreddit: 'test',
            },
          })),
          after,
        },
      }),
  };
}

describe('scrapeReddit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
      id: 'source-1',
      projectId: 'proj-1',
      platform: 'REDDIT',
      url: 'https://www.reddit.com/r/test',
      config: { sort: 'hot', timeframe: 'week', limit: 5 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.rawPost.upsert).mockResolvedValue({} as never);
  });

  it('should fetch posts from Reddit JSON API', async () => {
    mockFetch.mockResolvedValueOnce(
      redditListing([
        { id: 'abc1', title: 'Post 1' },
        { id: 'abc2', title: 'Post 2' },
      ]),
    );

    const count = await scrapeReddit('source-1');

    expect(count).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(prisma.rawPost.upsert).toHaveBeenCalledTimes(2);
  });

  it('should set correct User-Agent header', async () => {
    mockFetch.mockResolvedValueOnce(redditListing([]));

    await scrapeReddit('source-1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'User-Agent': 'PromptOps/0.1.0' },
      }),
    );
  });

  it('should respect the limit from config', async () => {
    const posts = Array.from({ length: 10 }, (_, i) => ({ id: `post${i}`, title: `Post ${i}` }));
    mockFetch.mockResolvedValueOnce(redditListing(posts));

    const count = await scrapeReddit('source-1');

    // Config limit is 5
    expect(count).toBe(5);
    expect(prisma.rawPost.upsert).toHaveBeenCalledTimes(5);
  });

  it('should throw on invalid subreddit URL', async () => {
    vi.mocked(prisma.source.findUniqueOrThrow).mockResolvedValue({
      id: 'source-1',
      projectId: 'proj-1',
      platform: 'REDDIT',
      url: 'https://example.com/not-reddit',
      config: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(scrapeReddit('source-1')).rejects.toThrow('Invalid subreddit URL');
  });

  it('should throw on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' });

    await expect(scrapeReddit('source-1')).rejects.toThrow('Reddit API error: 429');
  });
});
