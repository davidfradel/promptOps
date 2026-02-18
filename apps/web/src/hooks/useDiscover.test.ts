import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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
import { useDiscover } from './useDiscover';
import type { DiscoverInsight } from '@promptops/shared';

const mockGet = vi.mocked(api.get);

const fakeInsight: DiscoverInsight = {
  id: 'ins-1',
  projectId: 'proj-1',
  type: 'PAIN_POINT',
  title: 'Test Insight',
  description: 'A test pain point',
  severity: 2,
  confidence: 0.8,
  tags: ['auth'],
  metadata: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  category: 'DEVTOOLS',
  isSaved: false,
  projectName: 'Test Project',
};

describe('useDiscover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns insights on mount', async () => {
    mockGet.mockResolvedValue(mockApiResponse([fakeInsight]));

    const { result } = renderHook(() => useDiscover());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.insights).toEqual([fakeInsight]);
    expect(result.current.error).toBeNull();
    expect(mockGet).toHaveBeenCalledWith('/discover');
  });

  it('returns empty array when no data', async () => {
    mockGet.mockResolvedValue(mockApiResponse(null));

    const { result } = renderHook(() => useDiscover());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.insights).toEqual([]);
  });

  it('sets error on failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDiscover());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.insights).toEqual([]);
  });
});
