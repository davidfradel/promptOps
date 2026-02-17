import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      data: null,
      error: { message: err.message, code: err.code },
      meta: null,
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    data: null,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    meta: null,
  });
}
