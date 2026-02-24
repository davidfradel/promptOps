import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

const PH_GRAPHQL = 'https://api.producthunt.com/v2/api/graphql';

interface PHReviewNode {
  body: string;
  rating?: number;
}

interface PHPostNode {
  id: string;
  name: string;
  tagline: string;
  description?: string | null;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  url: string;
  reviews: { edges: Array<{ node: PHReviewNode }> };
}

interface PHResponse {
  data?: { posts?: { edges: Array<{ node: PHPostNode }> } };
  errors?: Array<{ message: string }>;
}

export async function scrapeProductHunt(sourceId: string): Promise<number> {
  const apiKey = process.env.PRODUCTHUNT_API_KEY;
  if (!apiKey) {
    throw new Error(
      'PRODUCTHUNT_API_KEY is not set — get a developer token at producthunt.com/v2/oauth/applications',
    );
  }

  const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
  const config = (source.config as { topic?: string; limit?: number }) ?? {};
  const limit = Math.min(config.limit ?? 50, 100);

  // Topic from config, or parse it from the source URL slug
  const topic = config.topic ?? source.url.split('/').filter(Boolean).pop() ?? 'developer-tools';

  const query = `{
    posts(first: ${limit}, topic: "${topic}", order: VOTES) {
      edges {
        node {
          id
          name
          tagline
          description
          votesCount
          commentsCount
          createdAt
          url
          reviews(first: 5) {
            edges {
              node {
                body
                rating
              }
            }
          }
        }
      }
    }
  }`;

  const res = await fetch(PH_GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`ProductHunt API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as PHResponse;
  if (json.errors?.length) {
    throw new Error(`ProductHunt GraphQL error: ${json.errors[0]?.message}`);
  }

  const edges = json.data?.posts?.edges ?? [];
  let totalPosts = 0;

  for (const { node: post } of edges) {
    // Reviews are high-quality user feedback — use as topComments
    const topComments = post.reviews.edges
      .map((e) => e.node.body.trim())
      .filter((b) => b.length > 20)
      .slice(0, 3)
      .map((b) => b.slice(0, 400));

    // Body: prefer description, fall back to tagline
    const body = (post.description || post.tagline).slice(0, 1000);

    await prisma.rawPost.upsert({
      where: {
        platform_externalId: { platform: 'PRODUCTHUNT', externalId: post.id },
      },
      create: {
        sourceId: source.id,
        externalId: post.id,
        platform: 'PRODUCTHUNT',
        title: post.name,
        body: body || null,
        author: null,
        url: post.url,
        score: post.votesCount,
        postedAt: new Date(post.createdAt),
        metadata: {
          commentsCount: post.commentsCount,
          topComments,
        },
      },
      update: {
        score: post.votesCount,
        metadata: {
          commentsCount: post.commentsCount,
          topComments,
        },
      },
    });

    totalPosts++;
  }

  logger.info({ sourceId, totalPosts, topic }, 'ProductHunt scrape completed');
  return totalPosts;
}
