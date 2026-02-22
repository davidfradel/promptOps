import { Router } from 'express';
import { authRouter } from './auth.js';
import { projectsRouter } from './projects.js';
import { sourcesRouter } from './sources.js';
import { insightsRouter } from './insights.js';
import { specsRouter } from './specs.js';
import { categoriesRouter } from './categories.js';
import { onboardingRouter } from './onboarding.js';
import { discoverRouter } from './discover.js';
import { savedRouter } from './saved.js';
import { interestsRouter } from './interests.js';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimiter, aiRateLimiter } from '../middleware/rate-limiter.js';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';

export const router = Router();

let healthCache: { status: string; checks: Record<string, string>; timestamp: string } | null =
  null;
let healthCacheAt = 0;
const HEALTH_CACHE_TTL = 30_000; // 30 seconds

router.get('/api/v1/health', async (_req, res) => {
  const now = Date.now();
  if (healthCache && now - healthCacheAt < HEALTH_CACHE_TTL) {
    const statusCode = healthCache.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({ data: healthCache, error: null, meta: null });
    return;
  }

  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks['postgres'] = 'ok';
  } catch {
    checks['postgres'] = 'down';
    healthy = false;
  }

  try {
    await redis.ping();
    checks['redis'] = 'ok';
  } catch {
    checks['redis'] = 'down';
    healthy = false;
  }

  const status = healthy ? 'healthy' : 'degraded';
  const statusCode = healthy ? 200 : 503;

  healthCache = { status, timestamp: new Date().toISOString(), checks };
  healthCacheAt = now;

  res.status(statusCode).json({ data: healthCache, error: null, meta: null });
});

// AI rate limiting for specific endpoints
router.post('/api/v1/projects/:id/analyze', authMiddleware, aiRateLimiter);
router.post('/api/v1/specs/generate', authMiddleware, aiRateLimiter);

router.use('/api/v1/auth', authRateLimiter, authRouter);
router.use('/api/v1/categories', categoriesRouter);
router.use('/api/v1/onboarding', authMiddleware, onboardingRouter);
router.use('/api/v1/discover', authMiddleware, discoverRouter);
router.use('/api/v1/saved', authMiddleware, savedRouter);
router.use('/api/v1/interests', authMiddleware, interestsRouter);
router.use('/api/v1/projects', authMiddleware, projectsRouter);
router.use('/api/v1/sources', authMiddleware, sourcesRouter);
router.use('/api/v1/insights', authMiddleware, insightsRouter);
router.use('/api/v1/specs', authMiddleware, specsRouter);

// API 404 catch-all — return JSON instead of SPA fallback
router.all('/api/v1/{*path}', (_req, res) => {
  res.status(404).json({
    data: null,
    error: { message: 'API endpoint not found' },
    meta: null,
  });
});
