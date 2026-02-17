export const Platform = {
  REDDIT: 'REDDIT',
  HACKERNEWS: 'HACKERNEWS',
  TWITTER: 'TWITTER',
  PRODUCTHUNT: 'PRODUCTHUNT',
} as const;
export type Platform = (typeof Platform)[keyof typeof Platform];

export const JobStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export interface Source {
  id: string;
  projectId: string;
  platform: Platform;
  url: string;
  config: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RawPost {
  id: string;
  sourceId: string;
  externalId: string;
  platform: Platform;
  title: string | null;
  body: string | null;
  author: string | null;
  url: string | null;
  score: number | null;
  postedAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ScrapeJob {
  id: string;
  sourceId: string;
  status: JobStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  postsFound: number;
  createdAt: Date;
}
