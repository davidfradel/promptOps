import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { mockApiResponse } from '../test/hook-helpers';

vi.mock('../lib/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../lib/api.js';
import { useSaved } from './useSaved';
import type { DiscoverInsight } from '@promptops/shared';

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);
const mockDelete = vi.mocked(api.delete);

const fakeInsight: DiscoverInsight = {
  id: 'ins-1',
  projectId: 'proj-1',
  type: 'PAIN_POINT',
  title: 'Saved Insight',
  description: 'A saved pain point',
  severity: 2,
  confidence: 0.8,
  tags: ['auth'],
  metadata: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  category: 'DEVTOOLS',
  isSaved: true,
  projectName: 'Test Project',
};

describe('useSaved', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns saved insights on mount', async () => {
    mockGet.mockResolvedValue(mockApiResponse([fakeInsight]));

    const { result } = renderHook(() => useSaved());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.savedInsights).toEqual([fakeInsight]);
    expect(result.current.error).toBeNull();
    expect(mockGet).toHaveBeenCalledWith('/saved');
  });

  it('saveInsight calls api.post and refetches', async () => {
    mockGet.mockResolvedValue(mockApiResponse([fakeInsight]));
    mockPost.mockResolvedValue(mockApiResponse(null));

    const { result } = renderHook(() => useSaved());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGet.mockClear();
    mockGet.mockResolvedValue(mockApiResponse([fakeInsight]));

    await act(async () => {
      await result.current.saveInsight('ins-1');
    });

    expect(mockPost).toHaveBeenCalledWith('/saved/ins-1', {});
    expect(mockGet).toHaveBeenCalledWith('/saved');
  });

  it('unsaveInsight calls api.delete and refetches', async () => {
    mockGet.mockResolvedValue(mockApiResponse([fakeInsight]));
    mockDelete.mockResolvedValue(mockApiResponse(null));

    const { result } = renderHook(() => useSaved());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGet.mockClear();
    mockGet.mockResolvedValue(mockApiResponse([]));

    await act(async () => {
      await result.current.unsaveInsight('ins-1');
    });

    expect(mockDelete).toHaveBeenCalledWith('/saved/ins-1');
    expect(mockGet).toHaveBeenCalledWith('/saved');
  });

  it('sets error on failure', async () => {
    mockGet.mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useSaved());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load');
    expect(result.current.savedInsights).toEqual([]);
  });
});
