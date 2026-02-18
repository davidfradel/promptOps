import type { ApiResponse } from '@promptops/shared';
import type { ZodType } from 'zod';

const BASE_URL = '/api/v1';

async function request<T>(
  path: string,
  options?: RequestInit,
  dataSchema?: ZodType<T>,
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('promptops_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem('promptops_token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok && !json.error) {
    throw new Error(`Request failed: ${res.status}`);
  }

  // Optional response validation
  if (dataSchema && json.data !== null) {
    const result = dataSchema.safeParse(json.data);
    if (!result.success) {
      console.warn(`[api] Response validation failed for ${path}:`, result.error.issues);
    }
  }

  return json;
}

export const api = {
  get: <T>(path: string, dataSchema?: ZodType<T>) => request<T>(path, undefined, dataSchema),
  post: <T>(path: string, body: unknown, dataSchema?: ZodType<T>) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, dataSchema),
  patch: <T>(path: string, body: unknown, dataSchema?: ZodType<T>) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, dataSchema),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
