import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const ALGOLIA_API = 'https://hn.algolia.com/api/v1';

interface HNItem {
  id: number;
  title?: string;
  text?: string;
  by?: string;
  url?: string;
  score?: number;
  time?: number;
  type?: string;
  descendants?: number;
  kids?: number[]; // Child comment IDs (top-level only)
}

interface AlgoliaHit {
  objectID: string;
  title: string;
  story_text?: string;
  author: string;
  url?: string;
  points: number;
  created_at: string;
  num_comments: number;
  _tags: string[];
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
}

export async function scrapeHackerNews(sourceId: string): Promise<number> {
  const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
  const config = (source.config as { limit?: number; tags?: string }) ?? {};
  const limit = Math.min(config.limit ?? 50, 200);

  const feedTypes = ['topstories', 'newstories', 'beststories'];
  const isFeedMode = feedTypes.some((ft) => source.url.includes(ft));

  if (isFeedMode) {
    return await scrapeFeed(source.id, source.url, limit);
  } else {
    return await scrapeSearch(source.id, source.url, limit, config.tags);
  }
}

async function scrapeFeed(sourceId: string, url: string, limit: number): Promise<number> {
  // Extract feed type from URL
  const feedType = url.includes('topstories')
    ? 'topstories'
    : url.includes('newstories')
      ? 'newstories'
      : 'beststories';

  const response = await fetch(`${HN_API}/${feedType}.json`);
  if (!response.ok) throw new Error(`HN API error: ${response.status}`);

  const ids = (await response.json()) as number[];
  const targetIds = ids.slice(0, limit);

  let totalPosts = 0;

  // Batch fetch items 5 at a time
  for (let i = 0; i < targetIds.length; i += 5) {
    const batch = targetIds.slice(i, i + 5);
    const items = await Promise.all(
      batch.map(async (id) => {
        const res = await fetch(`${HN_API}/item/${id}.json`);
        return res.ok ? ((await res.json()) as HNItem) : null;
      }),
    );

    for (const item of items) {
      if (!item || item.type === 'comment') continue;

      await prisma.rawPost.upsert({
        where: {
          platform_externalId: { platform: 'HACKERNEWS', externalId: String(item.id) },
        },
        create: {
          sourceId,
          externalId: String(item.id),
          platform: 'HACKERNEWS',
          title: item.title ?? null,
          body: item.text ?? null,
          author: item.by ?? null,
          url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
          score: item.score ?? 0,
          postedAt: item.time ? new Date(item.time * 1000) : null,
          metadata: {
            descendants: item.descendants ?? 0,
            kids: item.kids?.slice(0, 5), // Store top 5 comment IDs for later enrichment
          },
        },
        update: {
          score: item.score ?? 0,
          metadata: {
            descendants: item.descendants ?? 0,
            kids: item.kids?.slice(0, 5),
          },
        },
      });
      totalPosts++;
    }

    // 200ms delay between batches
    if (i + 5 < targetIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  await enrichTopPostsWithComments(sourceId);

  logger.info({ sourceId, totalPosts, feedType }, 'HN feed scrape completed');
  return totalPosts;
}

async function scrapeSearch(
  sourceId: string,
  query: string,
  limit: number,
  tags?: string,
): Promise<number> {
  const url = new URL(`${ALGOLIA_API}/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('hitsPerPage', String(Math.min(limit, 50)));
  if (tags) url.searchParams.set('tags', tags);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Algolia HN API error: ${response.status}`);

  const data = (await response.json()) as AlgoliaResponse;
  let totalPosts = 0;

  for (const hit of data.hits) {
    if (totalPosts >= limit) break;

    await prisma.rawPost.upsert({
      where: {
        platform_externalId: { platform: 'HACKERNEWS', externalId: hit.objectID },
      },
      create: {
        sourceId,
        externalId: hit.objectID,
        platform: 'HACKERNEWS',
        title: hit.title,
        body: hit.story_text ?? null,
        author: hit.author,
        url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        score: hit.points,
        postedAt: new Date(hit.created_at),
        metadata: {
          numComments: hit.num_comments,
          tags: hit._tags,
        },
      },
      update: {
        score: hit.points,
        metadata: {
          numComments: hit.num_comments,
          tags: hit._tags,
        },
      },
    });
    totalPosts++;
  }

  logger.info({ sourceId, totalPosts, query }, 'HN search scrape completed');
  return totalPosts;
}

// Fetch top comments for the most engaged HN stories and store in metadata.
// Uses kids IDs stored during feed scraping — no-op for search mode (no kids available).
async function enrichTopPostsWithComments(sourceId: string): Promise<void> {
  type HNPostMeta = { descendants?: number; kids?: number[]; topComments?: string[] };

  const posts = await prisma.rawPost.findMany({
    where: { sourceId, platform: 'HACKERNEWS' },
    orderBy: { score: 'desc' },
    take: 100,
  });

  // Rank by engagement; skip posts without kids or already enriched
  const toEnrich = posts
    .map((p) => ({ ...p, meta: (p.metadata as HNPostMeta | null) ?? {} }))
    .filter(
      (p) =>
        (p.meta.descendants ?? 0) >= 10 && !p.meta.topComments && (p.meta.kids?.length ?? 0) > 0,
    )
    .sort((a, b) => {
      const engA = (a.score ?? 0) + (a.meta.descendants ?? 0) * 3;
      const engB = (b.score ?? 0) + (b.meta.descendants ?? 0) * 3;
      return engB - engA;
    })
    .slice(0, 8);

  for (const post of toEnrich) {
    const kidIds = post.meta.kids?.slice(0, 3) ?? [];
    if (kidIds.length === 0) continue;

    try {
      const topComments: string[] = [];

      for (const kidId of kidIds) {
        const res = await fetch(`${HN_API}/item/${kidId}.json`);
        if (!res.ok) continue;
        const comment = (await res.json()) as HNItem;

        if (comment.type === 'comment' && comment.text) {
          // Strip HTML tags from HN comment bodies
          const clean = comment.text
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&gt;/g, '>')
            .replace(/&lt;/g, '<')
            .replace(/&#x27;/g, "'")
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 400);
          if (clean.length > 30) topComments.push(clean);
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (topComments.length > 0) {
        await prisma.rawPost.update({
          where: { id: post.id },
          data: { metadata: { ...post.meta, topComments } },
        });
        logger.debug({ postId: post.id, count: topComments.length }, 'HN comments enriched');
      }
    } catch (err) {
      logger.warn({ postId: post.id, err }, 'Failed to enrich HN post with comments');
    }
  }
}
