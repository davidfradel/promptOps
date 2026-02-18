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
});
