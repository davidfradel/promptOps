import { z } from 'zod';

export const PlatformSchema = z.enum(['REDDIT', 'HACKERNEWS', 'TWITTER', 'PRODUCTHUNT']);
export const InsightTypeSchema = z.enum([
  'PAIN_POINT',
  'FEATURE_REQUEST',
  'COMPETITOR',
  'TREND',
  'SENTIMENT',
]);
export const SpecFormatSchema = z.enum(['MARKDOWN', 'CLAUDE_CODE', 'LINEAR']);
export const JobStatusSchema = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']);
export const CategorySchema = z.enum([
  'SAAS',
  'DEVTOOLS',
  'AI_ML',
  'FINTECH',
  'ECOMMERCE',
  'MOBILE',
  'GAMING',
  'HEALTH',
  'EDUCATION',
  'SOCIAL',
  'SECURITY',
]);
export const ThreatLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
