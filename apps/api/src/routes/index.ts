import { Router } from 'express';
import { projectsRouter } from './projects.js';
import { sourcesRouter } from './sources.js';
import { insightsRouter } from './insights.js';
import { specsRouter } from './specs.js';

export const router = Router();

router.get('/api/v1/health', (_req, res) => {
  res.json({
    data: { status: 'healthy', timestamp: new Date().toISOString() },
    error: null,
    meta: null,
  });
});

router.use('/api/v1/projects', projectsRouter);
router.use('/api/v1/sources', sourcesRouter);
router.use('/api/v1/insights', insightsRouter);
router.use('/api/v1/specs', specsRouter);
