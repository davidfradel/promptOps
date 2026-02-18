// Enums
export {
  PlatformSchema,
  InsightTypeSchema,
  SpecFormatSchema,
  JobStatusSchema,
  CategorySchema,
  ThreatLevelSchema,
} from './enums.js';

// API
export {
  cuidParamSchema,
  paginationSchema,
  apiErrorSchema,
  apiMetaSchema,
  apiResponseSchema,
} from './api.js';

// Auth
export { registerSchema, loginSchema } from './auth.js';

// Project
export { createProjectSchema, updateProjectSchema } from './project.js';

// Source
export { createSourceSchema, sourcePaginationSchema } from './source.js';

// Insight
export { insightQuerySchema, updateInsightSchema } from './insight.js';

// Spec
export { createSpecSchema, generateSpecSchema, specPaginationSchema } from './spec.js';

// Jobs
export { scrapeJobDataSchema, analyzeJobDataSchema, generateJobDataSchema } from './jobs.js';

// Claude responses
export {
  claudeInsightSchema,
  competitorInsightSchema,
  prioritizedInsightSchema,
} from './claude-responses.js';
export type { ClaudeInsight, CompetitorInsight, PrioritizedInsight } from './claude-responses.js';

// Discover
export { discoverQuerySchema } from './discover.js';

// Onboarding
export { onboardingSchema, updateInterestsSchema } from './onboarding.js';
