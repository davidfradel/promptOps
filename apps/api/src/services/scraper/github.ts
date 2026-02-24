import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

const GH_API = 'https://api.github.com';

// Module-level rate limit state (shared across all calls in the process lifetime)
let ghRateLimitRemaining = 60;
let ghRateLimitReset = Math.floor(Date.now() / 1000) + 3600;

function updateRateLimit(res: Response): void {
  const remaining = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  if (remaining !== null) ghRateLimitRemaining = parseInt(remaining, 10);
  if (reset !== null) ghRateLimitReset = parseInt(reset, 10);
}

/** Returns false if we're rate-limited and can't wait; waits up to 60s if close to reset. */
async function checkRateLimit(minRemaining = 5): Promise<boolean> {
  if (ghRateLimitRemaining > minRemaining) return true;
  const waitMs = ghRateLimitReset * 1000 - Date.now() + 2000;
  if (waitMs > 0 && waitMs <= 60_000) {
    logger.warn(
      { waitMs, remaining: ghRateLimitRemaining },
      'GitHub rate limit low — waiting for reset',
    );
    await new Promise((r) => setTimeout(r, waitMs));
    ghRateLimitRemaining = 60; // optimistic reset
    return true;
  }
  logger.warn(
    { remaining: ghRateLimitRemaining },
    'GitHub rate limit exhausted — skipping this step',
  );
  return false;
}

interface GHLabel {
  name: string;
}

interface GHIssue {
  number: number;
  title: string;
  body: string | null;
  user: { login: string } | null;
  html_url: string;
  repository_url: string; // e.g. https://api.github.com/repos/owner/repo
  comments: number;
  reactions?: { total_count: number };
  created_at: string;
  pull_request?: unknown; // Present only on PRs
  labels: GHLabel[];
}

interface GHComment {
  body: string;
  reactions?: { total_count: number };
}

interface GHSearchResponse {
  total_count: number;
  items: GHIssue[];
}

function buildHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'PromptOps/0.1.0',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// Build a stable externalId from the issue: "owner/repo#number"
function issueExternalId(issue: GHIssue): string {
  const repoPath = issue.repository_url.replace(`${GH_API}/repos/`, '');
  return `${repoPath}#${issue.number}`;
}

export async function scrapeGitHub(sourceId: string): Promise<number> {
  const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
  const config = (source.config as { limit?: number }) ?? {};
  const limit = Math.min(config.limit ?? 100, 300);
  const headers = buildHeaders();

  // Repo mode: https://github.com/owner/repo
  // Search mode: any other string is treated as a search query
  const isRepoUrl = /github\.com\/[^/]+\/[^/?#]+/.test(source.url);

  const totalPosts = isRepoUrl
    ? await scrapeRepo(sourceId, source.url, limit, headers)
    : await scrapeSearch(sourceId, source.url, limit, headers);

  await enrichTopIssuesWithComments(sourceId, headers);

  return totalPosts;
}

async function scrapeRepo(
  sourceId: string,
  url: string,
  limit: number,
  headers: Record<string, string>,
): Promise<number> {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match?.[1] || !match?.[2]) throw new Error(`Invalid GitHub repo URL: ${url}`);
  const [, owner, repo] = match;

  let totalPosts = 0;
  let page = 1;
  const maxPages = Math.ceil(limit / 100);

  while (totalPosts < limit && page <= maxPages) {
    if (!(await checkRateLimit(10))) break;

    const apiUrl = `${GH_API}/repos/${owner}/${repo}/issues?state=open&sort=comments&direction=desc&per_page=100&page=${page}`;

    logger.info({ url: apiUrl, page }, 'Fetching GitHub repo issues');
    const res = await fetch(apiUrl, { headers });
    updateRateLimit(res);
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

    const issues = (await res.json()) as GHIssue[];
    if (issues.length === 0) break;

    for (const issue of issues) {
      if (totalPosts >= limit) break;
      if (issue.pull_request) continue; // Issues endpoint also returns PRs — skip them
      await upsertIssue(sourceId, issue);
      totalPosts++;
    }

    page++;
    if (page <= maxPages && totalPosts < limit) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  logger.info({ sourceId, totalPosts, owner, repo }, 'GitHub repo scrape completed');
  return totalPosts;
}

async function scrapeSearch(
  sourceId: string,
  query: string,
  limit: number,
  headers: Record<string, string>,
): Promise<number> {
  // GitHub search API caps at 30 results per page; max 100/min with auth, 10/min without
  const perPage = Math.min(limit, 30);
  const searchQuery = encodeURIComponent(`${query} type:issue state:open`);
  const apiUrl = `${GH_API}/search/issues?q=${searchQuery}&sort=comments&order=desc&per_page=${perPage}`;

  if (!(await checkRateLimit(5))) return 0;

  logger.info({ query }, 'Searching GitHub issues');
  const res = await fetch(apiUrl, { headers });
  updateRateLimit(res);
  if (!res.ok) throw new Error(`GitHub Search API error: ${res.status} ${res.statusText}`);

  const data = (await res.json()) as GHSearchResponse;
  let totalPosts = 0;

  for (const issue of data.items) {
    if (totalPosts >= limit) break;
    if (issue.pull_request) continue;
    await upsertIssue(sourceId, issue);
    totalPosts++;
  }

  logger.info({ sourceId, totalPosts, query }, 'GitHub search scrape completed');
  return totalPosts;
}

async function upsertIssue(sourceId: string, issue: GHIssue): Promise<void> {
  const externalId = issueExternalId(issue);
  const repoPath = issue.repository_url.replace(`${GH_API}/repos/`, '');
  const labels = issue.labels.map((l) => l.name);
  const reactions = issue.reactions?.total_count ?? 0;

  await prisma.rawPost.upsert({
    where: { platform_externalId: { platform: 'GITHUB', externalId } },
    create: {
      sourceId,
      externalId,
      platform: 'GITHUB',
      title: issue.title,
      body: issue.body?.slice(0, 2000) ?? null,
      author: issue.user?.login ?? null,
      url: issue.html_url,
      score: issue.comments, // comment count = best engagement proxy for issues
      postedAt: new Date(issue.created_at),
      metadata: {
        comments: issue.comments,
        reactions,
        labels,
        repo: repoPath,
        issueNumber: issue.number,
      },
    },
    update: {
      score: issue.comments,
      metadata: {
        comments: issue.comments,
        reactions,
        labels,
        repo: repoPath,
        issueNumber: issue.number,
      },
    },
  });
}

// Fetch the first 5 comments for the 10 most engaged issues and cache in metadata.
// Skips issues already enriched (idempotent).
async function enrichTopIssuesWithComments(
  sourceId: string,
  headers: Record<string, string>,
): Promise<void> {
  type IssueMeta = {
    comments?: number;
    reactions?: number;
    repo?: string;
    issueNumber?: number;
    topComments?: string[];
  };

  const posts = await prisma.rawPost.findMany({
    where: { sourceId, platform: 'GITHUB' },
    orderBy: { score: 'desc' },
    take: 100,
  });

  const toEnrich = posts
    .map((p) => ({ ...p, meta: (p.metadata as IssueMeta | null) ?? {} }))
    .filter(
      (p) =>
        (p.meta.comments ?? 0) >= 5 &&
        !p.meta.topComments &&
        p.meta.repo &&
        p.meta.issueNumber != null,
    )
    .sort((a, b) => {
      // Rank by comments + reaction boost
      const engA = (a.meta.comments ?? 0) + (a.meta.reactions ?? 0) * 2;
      const engB = (b.meta.comments ?? 0) + (b.meta.reactions ?? 0) * 2;
      return engB - engA;
    })
    .slice(0, 10);

  for (const post of toEnrich) {
    const { repo, issueNumber } = post.meta;
    if (!repo || issueNumber == null) continue;

    if (!(await checkRateLimit(5))) {
      logger.warn({ sourceId }, 'GitHub rate limit too low — stopping comment enrichment early');
      break;
    }

    try {
      const url = `${GH_API}/repos/${repo}/issues/${issueNumber}/comments?per_page=5`;
      const res = await fetch(url, { headers });
      updateRateLimit(res);
      if (!res.ok) continue;

      const comments = (await res.json()) as GHComment[];
      const topComments = comments
        .filter((c) => c.body.trim().length > 30)
        .slice(0, 3)
        .map((c) => c.body.slice(0, 400));

      if (topComments.length > 0) {
        await prisma.rawPost.update({
          where: { id: post.id },
          data: { metadata: { ...post.meta, topComments } },
        });
        logger.debug({ postId: post.id, count: topComments.length }, 'GitHub comments enriched');
      }

      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      logger.warn({ postId: post.id, err }, 'Failed to enrich GitHub issue with comments');
    }
  }
}
