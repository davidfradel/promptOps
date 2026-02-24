import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    ANTHROPIC_API_KEY: z.string().default(''),
    JWT_SECRET: z.string().min(1).default('dev-secret-change-in-production'),
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    CORS_ORIGINS: z.string().default('*'),
    SENTRY_DSN: z.string().optional(),
    PRODUCTHUNT_API_KEY: z.string().optional(),
    GITHUB_TOKEN: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (data.JWT_SECRET === 'dev-secret-change-in-production' || data.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'JWT_SECRET must be at least 32 characters and not the default value in production',
          path: ['JWT_SECRET'],
        });
      }
      if (!data.ANTHROPIC_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ANTHROPIC_API_KEY is required in production',
          path: ['ANTHROPIC_API_KEY'],
        });
      }
      if (data.CORS_ORIGINS === '*') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CORS_ORIGINS must not be wildcard (*) in production',
          path: ['CORS_ORIGINS'],
        });
      }
    }
  });

export const env = envSchema.parse(process.env);
