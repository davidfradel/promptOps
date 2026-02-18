import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('../services/onboarding.js', () => ({
  completeOnboarding: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/auth.js', () => ({
  verifyToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import { completeOnboarding } from '../services/onboarding.js';
import { onboardingRouter } from './onboarding.js';
import { authMiddleware } from '../middleware/auth.js';
import { errorHandler } from '../middleware/error-handler.js';
import { mockUser, authHeaders, request } from '../test/helpers.js';

function createAuthTestApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use('/', onboardingRouter);
  app.use(errorHandler);
  return app;
}

describe('onboarding routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
    app = createAuthTestApp();
  });

  describe('POST /', () => {
    it('should complete onboarding', async () => {
      const res = await request(
        app,
        'POST',
        '/',
        { categories: ['SAAS', 'DEVTOOLS'] },
        authHeaders(),
      );

      expect(res.status).toBe(200);
      expect(completeOnboarding).toHaveBeenCalledWith('user-1', ['SAAS', 'DEVTOOLS']);
      expect(res.body.data).toMatchObject({ message: 'Onboarding completed' });
    });

    it('should return validation error for empty categories', async () => {
      const res = await request(app, 'POST', '/', { categories: [] }, authHeaders());

      expect(res.status).toBe(400);
    });
  });
});
