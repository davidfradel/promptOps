import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

interface RedditPost {
  kind: string;
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    permalink: string;
    score: number;
    created_utc: number;
    num_comments: number;
    url: string;
    subreddit: string;
  };
}

interface RedditListing {
  data: {
    children: RedditPost[];
    after: string | null;
  };
}

interface RedditCommentChild {
  kind: string;
  data: {
    body?: string;
    author?: string;
  };
}

interface RedditCommentPage {
  data: { children: RedditCommentChild[] };
}

export async function scrapeReddit(sourceId: string): Promise<number> {
  const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });

  const config = (source.config as { sort?: string; timeframe?: string; limit?: number }) ?? {};
  const sort = config.sort ?? 'hot';
  const timeframe = config.timeframe ?? 'week';
  const limit = Math.min(config.limit ?? 100, 500);

  // Parse subreddit URL to get the base URL
  const baseUrl = source.url.replace(/\/$/, '');
  if (!baseUrl.includes('/r/')) {
    throw new Error(`Invalid subreddit URL: ${source.url}`);
  }

  let totalPosts = 0;
  let after: string | null = null;
  const maxPages = 5;

  for (let page = 0; page < maxPages && totalPosts < limit; page++) {
    const url = new URL(`${baseUrl}/${sort}.json`);
    url.searchParams.set('limit', '25');
    url.searchParams.set('t', timeframe);
    url.searchParams.set('raw_json', '1');
    if (after) url.searchParams.set('after', after);

    logger.info({ url: url.toString(), page }, 'Fetching Reddit page');

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'PromptOps/0.1.0' },
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }

    const listing = (await response.json()) as RedditListing;
    const posts = listing.data.children;

    if (posts.length === 0) break;

    for (const post of posts) {
      if (totalPosts >= limit) break;

      const d = post.data;
      await prisma.rawPost.upsert({
        where: {
          platform_externalId: { platform: 'REDDIT', externalId: d.id },
        },
        create: {
          sourceId: source.id,
          externalId: d.id,
          platform: 'REDDIT',
          title: d.title,
          body: d.selftext || null,
          author: d.author,
          url: `https://www.reddit.com${d.permalink}`,
          score: d.score,
          postedAt: new Date(d.created_utc * 1000),
          metadata: {
            numComments: d.num_comments,
            subreddit: d.subreddit,
          },
        },
        update: {
          score: d.score,
          metadata: {
            numComments: d.num_comments,
            subreddit: d.subreddit,
          },
        },
      });
      totalPosts++;
    }

    after = listing.data.after;
    if (!after) break;

    // Rate limiting: 1.5s delay between pages
    if (page < maxPages - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  await enrichTopPostsWithComments(sourceId);

  logger.info({ sourceId, totalPosts }, 'Reddit scrape completed');
  return totalPosts;
}

// Fetch top comments for the most engaged posts and store in metadata.
// Only processes posts that don't already have topComments cached.
async function enrichTopPostsWithComments(sourceId: string): Promise<void> {
  type PostMeta = { numComments?: number; subreddit?: string; topComments?: string[] };

  const posts = await prisma.rawPost.findMany({
    where: { sourceId, platform: 'REDDIT' },
    orderBy: { score: 'desc' },
    take: 100,
  });

  // Rank by engagement: score + numComments × 2; skip already enriched posts
  const toEnrich = posts
    .map((p) => ({ ...p, meta: (p.metadata as PostMeta | null) ?? {} }))
    .filter((p) => (p.meta.numComments ?? 0) >= 10 && !p.meta.topComments)
    .sort((a, b) => {
      const engA = (a.score ?? 0) + (a.meta.numComments ?? 0) * 2;
      const engB = (b.score ?? 0) + (b.meta.numComments ?? 0) * 2;
      return engB - engA;
    })
    .slice(0, 10);

  for (const post of toEnrich) {
    const { subreddit } = post.meta;
    if (!subreddit) continue;

    try {
      const url = `https://www.reddit.com/r/${subreddit}/comments/${post.externalId}.json?sort=top&limit=5&depth=1&raw_json=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'PromptOps/0.1.0' } });
      if (!res.ok) continue;

      const json = (await res.json()) as [unknown, RedditCommentPage];
      const topComments = json[1]?.data?.children
        ?.filter(
          (c) =>
            c.kind === 't1' && c.data.body && !['[deleted]', '[removed]'].includes(c.data.body),
        )
        ?.slice(0, 3)
        ?.map((c) => (c.data.body ?? '').slice(0, 400));

      if (topComments && topComments.length > 0) {
        await prisma.rawPost.update({
          where: { id: post.id },
          data: { metadata: { ...post.meta, topComments } },
        });
        logger.debug({ postId: post.id, count: topComments.length }, 'Reddit comments enriched');
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      logger.warn({ postId: post.id, err }, 'Failed to enrich Reddit post with comments');
    }
  }
}
