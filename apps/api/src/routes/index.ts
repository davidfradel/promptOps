import { Router } from 'express';
import { authRouter } from './auth.js';
import { projectsRouter } from './projects.js';
import { sourcesRouter } from './sources.js';
import { insightsRouter } from './insights.js';
import { specsRouter } from './specs.js';
import { authMiddleware } from '../middleware/auth.js';

export const router = Router();

router.get('/api/v1/health', (_req, res) => {
  res.json({
    data: { status: 'healthy', timestamp: new Date().toISOString() },
    error: null,
    meta: null,
  });
});

router.use('/api/v1/auth', authRouter);
router.use('/api/v1/projects', authMiddleware, projectsRouter);
router.use('/api/v1/sources', authMiddleware, sourcesRouter);
router.use('/api/v1/insights', authMiddleware, insightsRouter);
router.use('/api/v1/specs', authMiddleware, specsRouter);
