import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
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
import { useSpecGeneration } from './useAnalysis';

const mockPost = vi.mocked(api.post);

describe('useSpecGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateSpec calls api.post with correct params', async () => {
    mockPost.mockResolvedValue(mockApiResponse({ id: 'spec-1' }));

    const { result } = renderHook(() => useSpecGeneration());

    await act(async () => {
      await result.current.generateSpec('proj-1', 'MARKDOWN');
    });

    expect(mockPost).toHaveBeenCalledWith('/specs/generate', {
      projectId: 'proj-1',
      format: 'MARKDOWN',
    });
  });

  it('returns data on success', async () => {
    const specData = { id: 'spec-1', title: 'Generated Spec' };
    mockPost.mockResolvedValue(mockApiResponse(specData));

    const { result } = renderHook(() => useSpecGeneration());

    let data: unknown;
    await act(async () => {
      data = await result.current.generateSpec('proj-1');
    });

    expect(data).toEqual(specData);
    expect(result.current.error).toBeNull();
  });

  it('sets error on failure', async () => {
    mockPost.mockResolvedValue(mockApiError('Generation failed'));

    const { result } = renderHook(() => useSpecGeneration());

    await act(async () => {
      try {
        await result.current.generateSpec('proj-1');
      } catch {
        // generateSpec re-throws errors
      }
    });

    expect(result.current.error).toBe('Generation failed');
  });

  it('loading state toggles correctly', async () => {
    let resolvePost: (value: unknown) => void;
    mockPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );

    const { result } = renderHook(() => useSpecGeneration());

    expect(result.current.loading).toBe(false);

    let generatePromise: Promise<unknown>;
    act(() => {
      generatePromise = result.current.generateSpec('proj-1');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolvePost!(mockApiResponse({ id: 'spec-1' }));
      await generatePromise!;
    });

    expect(result.current.loading).toBe(false);
  });
});
