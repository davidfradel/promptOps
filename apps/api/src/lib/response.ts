import type { Response } from 'express';
import type { ApiError, ApiMeta } from '@promptops/shared';

export function sendSuccess<T>(res: Response, data: T, meta: ApiMeta | null = null): void {
  res.json({ data, error: null, meta });
}

export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json({ data, error: null, meta: null });
}

export function sendError(res: Response, statusCode: number, error: ApiError): void {
  res.status(statusCode).json({ data: null, error, meta: null });
}
