import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUnsaveInsight = vi.fn();
const mockGenerateSpec = vi.fn();
const mockAddToast = vi.fn();
const mockRefetchSpecs = vi.fn();

vi.mock('../hooks/useSaved', () => ({ useSaved: vi.fn() }));
vi.mock('../hooks/useSpecs', () => ({ useSpecs: vi.fn() }));
vi.mock('../hooks/useAnalysis', () => ({ useSpecGeneration: vi.fn() }));
vi.mock('../hooks/useJobStatus', () => ({ useSpecPolling: vi.fn() }));
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ toasts: [], addToast: mockAddToast, removeToast: vi.fn() }),
}));
vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { useSaved } from '../hooks/useSaved';
import { useSpecs } from '../hooks/useSpecs';
import { useSpecGeneration } from '../hooks/useAnalysis';
import { useSpecPolling } from '../hooks/useJobStatus';
import { api } from '../lib/api.js';
import { SavedInsights } from './SavedInsights';
import type { DiscoverInsight, Spec } from '@promptops/shared';

const mockUseSaved = vi.mocked(useSaved);
const mockUseSpecs = vi.mocked(useSpecs);
const mockUseSpecGeneration = vi.mocked(useSpecGeneration);
const mockUseSpecPolling = vi.mocked(useSpecPolling);
const mockApi = vi.mocked(api);

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

const fakeSpec: Spec = {
  id: 'spec-1',
  projectId: 'proj-1',
  title: 'Auth Improvements',
  content: '# Auth Improvements\n\nDetailed spec content here.',
  format: 'MARKDOWN',
  version: 1,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const generatingSpec: Spec = {
  id: 'spec-2',
  projectId: 'proj-1',
  title: 'In Progress Spec',
  content: 'Generating...',
  format: 'CLAUDE_CODE',
  version: 1,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('SavedInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSaved.mockReturnValue({
      savedInsights: [],
      loading: false,
      error: null,
      saveInsight: vi.fn(),
      unsaveInsight: mockUnsaveInsight,
      refetch: vi.fn(),
    });

    mockUseSpecs.mockReturnValue({
      specs: [],
      loading: false,
      error: null,
      meta: null,
      refetch: mockRefetchSpecs,
    });

    mockUseSpecGeneration.mockReturnValue({
      generateSpec: mockGenerateSpec,
      loading: false,
      error: null,
    });

    mockUseSpecPolling.mockReturnValue({
      polling: false,
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
    });
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
    render(<SavedInsights />);

    expect(screen.getByText('No saved insights yet.')).toBeInTheDocument();
  });

  describe('Generate button states', () => {
    it('generate button disabled when no insight selected', () => {
      mockUseSaved.mockReturnValue({
        savedInsights: [fakeInsight],
        loading: false,
        error: null,
        saveInsight: vi.fn(),
        unsaveInsight: mockUnsaveInsight,
        refetch: vi.fn(),
      });

      render(<SavedInsights />);

      expect(screen.getByRole('button', { name: 'Generate Spec (0 insights)' })).toBeDisabled();
    });

    it('generate button enabled after selecting an insight', () => {
      mockUseSaved.mockReturnValue({
        savedInsights: [fakeInsight],
        loading: false,
        error: null,
        saveInsight: vi.fn(),
        unsaveInsight: mockUnsaveInsight,
        refetch: vi.fn(),
      });

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('checkbox'));

      expect(screen.getByRole('button', { name: 'Generate Spec (1 insight)' })).not.toBeDisabled();
    });

    it('shows "Queueing..." when generating', () => {
      mockUseSaved.mockReturnValue({
        savedInsights: [fakeInsight],
        loading: false,
        error: null,
        saveInsight: vi.fn(),
        unsaveInsight: mockUnsaveInsight,
        refetch: vi.fn(),
      });
      mockUseSpecGeneration.mockReturnValue({
        generateSpec: mockGenerateSpec,
        loading: true,
        error: null,
      });

      render(<SavedInsights />);

      expect(screen.getByRole('button', { name: 'Queueing...' })).toBeDisabled();
    });

    it('shows "Generating..." when polling', () => {
      mockUseSaved.mockReturnValue({
        savedInsights: [fakeInsight],
        loading: false,
        error: null,
        saveInsight: vi.fn(),
        unsaveInsight: mockUnsaveInsight,
        refetch: vi.fn(),
      });
      mockUseSpecPolling.mockReturnValue({
        polling: true,
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
      });

      render(<SavedInsights />);

      expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled();
    });
  });

  describe('Spec generation workflow', () => {
    it('calls generateSpec with selected insight IDs', async () => {
      mockUseSaved.mockReturnValue({
        savedInsights: [fakeInsight],
        loading: false,
        error: null,
        saveInsight: vi.fn(),
        unsaveInsight: mockUnsaveInsight,
        refetch: vi.fn(),
      });
      mockGenerateSpec.mockResolvedValueOnce({ id: 'spec-new' });

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: 'Generate Spec (1 insight)' }));

      await waitFor(() => {
        expect(mockGenerateSpec).toHaveBeenCalledWith(['ins-1'], 'MARKDOWN');
      });
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'info',
          message: 'Spec generation started...',
        });
      });
    });

    it('shows error when generateSpec fails', async () => {
      mockUseSaved.mockReturnValue({
        savedInsights: [fakeInsight],
        loading: false,
        error: null,
        saveInsight: vi.fn(),
        unsaveInsight: mockUnsaveInsight,
        refetch: vi.fn(),
      });
      mockGenerateSpec.mockRejectedValueOnce(new Error('API limit reached'));

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: 'Generate Spec (1 insight)' }));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({ type: 'error', message: 'API limit reached' });
      });
    });

    it('passes selected format to generateSpec', async () => {
      mockUseSaved.mockReturnValue({
        savedInsights: [fakeInsight],
        loading: false,
        error: null,
        saveInsight: vi.fn(),
        unsaveInsight: mockUnsaveInsight,
        refetch: vi.fn(),
      });
      mockGenerateSpec.mockResolvedValueOnce({ id: 'spec-new' });

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.change(screen.getByDisplayValue('Markdown'), { target: { value: 'LINEAR' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Spec (1 insight)' }));

      await waitFor(() => {
        expect(mockGenerateSpec).toHaveBeenCalledWith(['ins-1'], 'LINEAR');
      });
    });
  });

  describe('Unsave flow', () => {
    it('calls unsaveInsight and shows info toast', async () => {
      mockUnsaveInsight.mockResolvedValueOnce(undefined);
      mockUseSaved.mockReturnValue({
        savedInsights: [fakeInsight],
        loading: false,
        error: null,
        saveInsight: vi.fn(),
        unsaveInsight: mockUnsaveInsight,
        refetch: vi.fn(),
      });

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('button', { name: 'Saved' }));

      await waitFor(() => expect(mockUnsaveInsight).toHaveBeenCalledWith('ins-1'));
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'info',
          message: 'Insight removed from saved',
        });
      });
    });

    it('shows error toast on failure', async () => {
      mockUnsaveInsight.mockRejectedValueOnce(new Error('Network error'));
      mockUseSaved.mockReturnValue({
        savedInsights: [fakeInsight],
        loading: false,
        error: null,
        saveInsight: vi.fn(),
        unsaveInsight: mockUnsaveInsight,
        refetch: vi.fn(),
      });

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('button', { name: 'Saved' }));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to remove insight',
        });
      });
    });
  });

  describe('Generated Specs display', () => {
    it('shows section when specs loaded', () => {
      mockUseSpecs.mockReturnValue({
        specs: [fakeSpec],
        loading: false,
        error: null,
        meta: null,
        refetch: mockRefetchSpecs,
      });

      render(<SavedInsights />);

      expect(screen.getByText('Generated Specs')).toBeInTheDocument();
      expect(screen.getByText('Auth Improvements')).toBeInTheDocument();
    });

    it('shows format badge', () => {
      mockUseSpecs.mockReturnValue({
        specs: [fakeSpec],
        loading: false,
        error: null,
        meta: null,
        refetch: mockRefetchSpecs,
      });

      render(<SavedInsights />);

      expect(screen.getByText('MARKDOWN')).toBeInTheDocument();
    });

    it('shows Generating badge for placeholder content', () => {
      mockUseSpecs.mockReturnValue({
        specs: [generatingSpec],
        loading: false,
        error: null,
        meta: null,
        refetch: mockRefetchSpecs,
      });

      render(<SavedInsights />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('hides section when no specs', () => {
      render(<SavedInsights />);

      expect(screen.queryByText('Generated Specs')).not.toBeInTheDocument();
    });

    it('shows delete button on each spec', () => {
      mockUseSpecs.mockReturnValue({
        specs: [fakeSpec],
        loading: false,
        error: null,
        meta: null,
        refetch: mockRefetchSpecs,
      });

      render(<SavedInsights />);

      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('calls api.delete and refetches on delete', async () => {
      mockUseSpecs.mockReturnValue({
        specs: [fakeSpec],
        loading: false,
        error: null,
        meta: null,
        refetch: mockRefetchSpecs,
      });
      mockApi.delete.mockResolvedValueOnce({ data: { deleted: true }, error: null, meta: null });

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith('/specs/spec-1');
        expect(mockRefetchSpecs).toHaveBeenCalled();
      });
    });
  });

  describe('Expand/Collapse', () => {
    it('expand shows full content and action buttons', () => {
      mockUseSpecs.mockReturnValue({
        specs: [fakeSpec],
        loading: false,
        error: null,
        meta: null,
        refetch: mockRefetchSpecs,
      });

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('button', { name: 'Expand' }));

      expect(screen.getByText(/# Auth Improvements/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy to Clipboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Export Markdown' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument();
    });
  });
});
