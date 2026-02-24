import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockRefetch = vi.fn();
const mockSaveInsight = vi.fn();
const mockUnsaveInsight = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../hooks/useDiscover', () => ({
  useDiscover: vi.fn(),
}));

vi.mock('../hooks/useSaved', () => ({
  useSaved: () => ({
    savedInsights: [],
    loading: false,
    error: null,
    saveInsight: mockSaveInsight,
    unsaveInsight: mockUnsaveInsight,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useInterests', () => ({
  useInterests: () => ({
    interests: [{ id: 'i-1', category: 'DEVTOOLS', createdAt: new Date() }],
    loading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    addToast: mockAddToast,
    removeToast: vi.fn(),
  }),
}));

import { useDiscover } from '../hooks/useDiscover';
import { Discover } from './Discover';
import type { DiscoverInsight } from '@promptops/shared';
import { fireEvent } from '@testing-library/react';

const mockUseDiscover = vi.mocked(useDiscover);

const fakeInsight: DiscoverInsight = {
  id: 'ins-1',
  projectId: 'proj-1',
  type: 'PAIN_POINT',
  title: 'Auth is broken',
  description: 'Users cannot log in',
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

describe('Discover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockUseDiscover.mockReturnValue({
      insights: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<Discover />);

    expect(screen.getByText('Loading insights...')).toBeInTheDocument();
  });

  it('shows insights when loaded', () => {
    mockUseDiscover.mockReturnValue({
      insights: [fakeInsight],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Discover />);

    expect(screen.getByText('Auth is broken')).toBeInTheDocument();
    expect(screen.getByText('Users cannot log in')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    mockUseDiscover.mockReturnValue({
      insights: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Discover />);

    expect(screen.getByText('No insights yet.')).toBeInTheDocument();
  });

  it('calls saveInsight and shows success toast on save', async () => {
    mockUseDiscover.mockReturnValue({
      insights: [fakeInsight],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockSaveInsight.mockResolvedValue(undefined);

    render(<Discover />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.waitFor(() => {
      expect(mockSaveInsight).toHaveBeenCalledWith('ins-1');
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', message: 'Insight saved!' }),
      );
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('shows error toast when save fails', async () => {
    mockUseDiscover.mockReturnValue({
      insights: [fakeInsight],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockSaveInsight.mockRejectedValue(new Error('Network error'));

    render(<Discover />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', message: 'Failed to save insight' }),
      );
    });
  });

  it('calls unsaveInsight and shows info toast on unsave', async () => {
    mockUseDiscover.mockReturnValue({
      insights: [{ ...fakeInsight, isSaved: true }],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUnsaveInsight.mockResolvedValue(undefined);

    render(<Discover />);

    // When isSaved=true the button text is "Saved"
    fireEvent.click(screen.getByRole('button', { name: 'Saved' }));

    await vi.waitFor(() => {
      expect(mockUnsaveInsight).toHaveBeenCalledWith('ins-1');
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'info', message: 'Insight removed from saved' }),
      );
    });
  });
});
