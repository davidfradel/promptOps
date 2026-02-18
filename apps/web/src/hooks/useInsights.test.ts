import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { mockApiResponse, mockApiError } from '../test/hook-helpers';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../lib/api';
import { useInsights } from './useInsights';
import type { Insight } from '@promptops/shared';

const mockGet = vi.mocked(api.get);

const fakeInsight: Insight = {
  id: 'ins-1',
  projectId: 'proj-1',
  type: 'PAIN_POINT',
  title: 'Test Insight',
  description: 'A pain point',
  severity: 2,
  confidence: 0.8,
  tags: ['auth'],
  metadata: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('useInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns insights on mount', async () => {
    mockGet.mockResolvedValue(mockApiResponse([fakeInsight]));

    const { result } = renderHook(() => useInsights());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.insights).toEqual([fakeInsight]);
    expect(result.current.error).toBeNull();
  });

  it('passes projectId as query param', async () => {
    mockGet.mockResolvedValue(mockApiResponse([fakeInsight]));

    const { result } = renderHook(() => useInsights('proj-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/insights?projectId=proj-1');
  });

  it('sets error on API error response', async () => {
    mockGet.mockResolvedValue(mockApiError('Unauthorized', 'AUTH_ERROR'));

    const { result } = renderHook(() => useInsights());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Unauthorized');
    expect(result.current.insights).toEqual([]);
  });
});
