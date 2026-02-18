import type { ApiResponse } from '@promptops/shared';

export function mockApiResponse<T>(
  data: T,
  meta?: { cursor: string | null; hasMore: boolean },
): ApiResponse<T> {
  return { data, error: null, meta: meta ?? null };
}

export function mockApiError(message: string, code = 'ERROR'): ApiResponse<never> {
  return { data: null, error: { message, code }, meta: null };
}
