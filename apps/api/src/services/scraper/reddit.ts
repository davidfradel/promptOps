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

  logger.info({ sourceId, totalPosts }, 'Reddit scrape completed');
  return totalPosts;
}
