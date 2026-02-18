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
import { useSpecs } from './useSpecs';
import type { Spec } from '@promptops/shared';

const mockGet = vi.mocked(api.get);

const fakeSpec: Spec = {
  id: 'spec-1',
  projectId: 'proj-1',
  title: 'Test Spec',
  content: '# Spec content',
  format: 'MARKDOWN',
  version: 1,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('useSpecs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns specs on mount', async () => {
    mockGet.mockResolvedValue(mockApiResponse([fakeSpec]));

    const { result } = renderHook(() => useSpecs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.specs).toEqual([fakeSpec]);
    expect(result.current.error).toBeNull();
  });

  it('passes projectId as query param', async () => {
    mockGet.mockResolvedValue(mockApiResponse([fakeSpec]));

    const { result } = renderHook(() => useSpecs('proj-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/specs?projectId=proj-1');
  });

  it('handles error', async () => {
    mockGet.mockResolvedValue(mockApiError('Server error', 'INTERNAL'));

    const { result } = renderHook(() => useSpecs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.specs).toEqual([]);
  });
});
