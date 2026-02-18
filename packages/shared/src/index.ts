export type { User, AuthTokens } from './types/user.js';
export type { Project } from './types/project.js';
export type { Insight, InsightSource, DiscoverInsight } from './types/insight.js';
export { InsightType } from './types/insight.js';
export type { Source, RawPost, ScrapeJob } from './types/source.js';
export { Platform, JobStatus } from './types/source.js';
export type { Spec } from './types/spec.js';
export { SpecFormat } from './types/spec.js';
export type { CategoryInfo } from './types/category.js';
export { Category, CATEGORIES } from './types/category.js';
export * from './constants/index.js';

// Schemas
export * from './schemas/index.js';

// API Response types
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  cursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta | null;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}
