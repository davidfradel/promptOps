import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { AppError, NotFoundError, ValidationError, AuthError } from '../lib/errors.js';
import { errorHandler } from './error-handler.js';
import { request } from '../test/helpers.js';

function createTestApp(errorToThrow: Error) {
  const app = express();
  app.use(express.json());
  app.get('/test', () => {
    throw errorToThrow;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return correct status for AppError', async () => {
    const app = createTestApp(new AppError('Custom error', 418, 'CUSTOM'));

    const res = await request(app, 'GET', '/test');

    expect(res.status).toBe(418);
    expect(res.body).toMatchObject({
      data: null,
      error: { message: 'Custom error', code: 'CUSTOM' },
      meta: null,
    });
  });

  it('should return 404 for NotFoundError', async () => {
    const app = createTestApp(new NotFoundError('Resource', 'res-1'));

    const res = await request(app, 'GET', '/test');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('should return 400 for ValidationError', async () => {
    const app = createTestApp(new ValidationError('Invalid input'));

    const res = await request(app, 'GET', '/test');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      message: 'Invalid input',
      code: 'VALIDATION_ERROR',
    });
  });

  it('should return 401 for AuthError', async () => {
    const app = createTestApp(new AuthError('Not authenticated'));

    const res = await request(app, 'GET', '/test');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({
      message: 'Not authenticated',
      code: 'UNAUTHORIZED',
    });
  });

  it('should return 500 for unknown errors', async () => {
    const app = createTestApp(new Error('Something unexpected'));

    const res = await request(app, 'GET', '/test');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      data: null,
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
      meta: null,
    });
  });
});
