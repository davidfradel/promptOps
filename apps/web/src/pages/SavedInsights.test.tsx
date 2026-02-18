import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUnsaveInsight = vi.fn();
const mockGenerateSpec = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../hooks/useSaved', () => ({
  useSaved: vi.fn(),
}));

vi.mock('../hooks/useSpecs', () => ({
  useSpecs: () => ({
    specs: [],
    loading: false,
    error: null,
    meta: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useAnalysis', () => ({
  useSpecGeneration: () => ({
    generateSpec: mockGenerateSpec,
    loading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useInterests', () => ({
  useInterests: () => ({
    interests: [{ id: 'i-1', category: 'DEVTOOLS', createdAt: new Date() }],
    loading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useJobStatus', () => ({
  useSpecPolling: () => ({
    polling: false,
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
  }),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    addToast: mockAddToast,
    removeToast: vi.fn(),
  }),
}));

vi.mock('../lib/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { useSaved } from '../hooks/useSaved';
import { SavedInsights } from './SavedInsights';
import type { DiscoverInsight } from '@promptops/shared';

const mockUseSaved = vi.mocked(useSaved);

const fakeInsight: DiscoverInsight = {
  id: 'ins-1',
  projectId: 'proj-1',
  type: 'PAIN_POINT',
  title: 'Saved pain point',
  description: 'Users report login failures',
  severity: 3,
  confidence: 0.9,
  tags: ['auth'],
  metadata: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  category: 'DEVTOOLS',
  isSaved: true,
  projectName: 'Test Project',
};

describe('SavedInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading', () => {
    mockUseSaved.mockReturnValue({
      savedInsights: [],
      loading: true,
      error: null,
      saveInsight: vi.fn(),
      unsaveInsight: mockUnsaveInsight,
      refetch: vi.fn(),
    });

    render(<SavedInsights />);

    expect(screen.getByText('Loading saved insights...')).toBeInTheDocument();
  });

  it('shows saved insights', () => {
    mockUseSaved.mockReturnValue({
      savedInsights: [fakeInsight],
      loading: false,
      error: null,
      saveInsight: vi.fn(),
      unsaveInsight: mockUnsaveInsight,
      refetch: vi.fn(),
    });

    render(<SavedInsights />);

    expect(screen.getByText('Saved pain point')).toBeInTheDocument();
    expect(screen.getByText('Users report login failures')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    mockUseSaved.mockReturnValue({
      savedInsights: [],
      loading: false,
      error: null,
      saveInsight: vi.fn(),
      unsaveInsight: mockUnsaveInsight,
      refetch: vi.fn(),
    });

    render(<SavedInsights />);

    expect(screen.getByText('No saved insights yet.')).toBeInTheDocument();
  });
});
