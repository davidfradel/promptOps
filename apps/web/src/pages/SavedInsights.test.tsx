import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUnsaveInsight = vi.fn();
const mockGenerateSpec = vi.fn();
const mockAddToast = vi.fn();
const mockRefetchSpecs = vi.fn();

vi.mock('../hooks/useSaved', () => ({
  useSaved: vi.fn(),
}));

vi.mock('../hooks/useSpecs', () => ({
  useSpecs: vi.fn(),
}));

vi.mock('../hooks/useAnalysis', () => ({
  useSpecGeneration: vi.fn(),
}));

vi.mock('../hooks/useInterests', () => ({
  useInterests: vi.fn(),
}));

vi.mock('../hooks/useJobStatus', () => ({
  useSpecPolling: vi.fn(),
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
import { useSpecs } from '../hooks/useSpecs';
import { useSpecGeneration } from '../hooks/useAnalysis';
import { useInterests } from '../hooks/useInterests';
import { useSpecPolling } from '../hooks/useJobStatus';
import { api } from '../lib/api.js';
import { SavedInsights } from './SavedInsights';
import type { DiscoverInsight, Spec } from '@promptops/shared';

const mockUseSaved = vi.mocked(useSaved);
const mockUseSpecs = vi.mocked(useSpecs);
const mockUseSpecGeneration = vi.mocked(useSpecGeneration);
const mockUseInterests = vi.mocked(useInterests);
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

    mockUseInterests.mockReturnValue({
      interests: [{ id: 'i-1', category: 'DEVTOOLS', createdAt: new Date() }],
      loading: false,
      updating: false,
      error: null,
      updateInterests: vi.fn(),
      refetch: vi.fn(),
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
    it('disabled when no category selected', () => {
      render(<SavedInsights />);

      const btn = screen.getByRole('button', { name: 'Generate Spec' });
      expect(btn).toBeDisabled();
    });

    it('shows "Queueing..." when generating', () => {
      mockUseSpecGeneration.mockReturnValue({
        generateSpec: mockGenerateSpec,
        loading: true,
        error: null,
      });

      render(<SavedInsights />);

      expect(screen.getByRole('button', { name: 'Queueing...' })).toBeDisabled();
    });

    it('shows "Generating..." when polling', () => {
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
    it('fetches projects and calls generateSpec', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: [{ id: 'proj-1', category: 'DEVTOOLS', isAutoGenerated: true }],
        error: null,
        meta: null,
      });
      mockGenerateSpec.mockResolvedValueOnce({ id: 'spec-new' });

      render(<SavedInsights />);

      fireEvent.change(screen.getByDisplayValue('Select category...'), {
        target: { value: 'DEVTOOLS' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Spec' }));

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/projects');
      });
      await waitFor(() => {
        expect(mockGenerateSpec).toHaveBeenCalledWith('proj-1', 'MARKDOWN');
      });
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'info',
          message: 'Spec generation started...',
        });
      });
    });

    it('shows error when no project found', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: [],
        error: null,
        meta: null,
      });

      render(<SavedInsights />);

      fireEvent.change(screen.getByDisplayValue('Select category...'), {
        target: { value: 'DEVTOOLS' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Spec' }));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'No project found for this category',
        });
      });
    });

    it('shows error when generateSpec fails', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: [{ id: 'proj-1', category: 'DEVTOOLS', isAutoGenerated: true }],
        error: null,
        meta: null,
      });
      mockGenerateSpec.mockRejectedValueOnce(new Error('API limit reached'));

      render(<SavedInsights />);

      fireEvent.change(screen.getByDisplayValue('Select category...'), {
        target: { value: 'DEVTOOLS' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Spec' }));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'API limit reached',
        });
      });
    });

    it('shows generic error for non-Error rejection', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: [{ id: 'proj-1', category: 'DEVTOOLS', isAutoGenerated: true }],
        error: null,
        meta: null,
      });
      mockGenerateSpec.mockRejectedValueOnce('something went wrong');

      render(<SavedInsights />);

      fireEvent.change(screen.getByDisplayValue('Select category...'), {
        target: { value: 'DEVTOOLS' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Spec' }));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to generate spec',
        });
      });
    });

    it('passes selected format to generateSpec', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: [{ id: 'proj-1', category: 'DEVTOOLS', isAutoGenerated: true }],
        error: null,
        meta: null,
      });
      mockGenerateSpec.mockResolvedValueOnce({ id: 'spec-new' });

      render(<SavedInsights />);

      fireEvent.change(screen.getByDisplayValue('Select category...'), {
        target: { value: 'DEVTOOLS' },
      });
      fireEvent.change(screen.getByDisplayValue('Markdown'), {
        target: { value: 'LINEAR' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Spec' }));

      await waitFor(() => {
        expect(mockGenerateSpec).toHaveBeenCalledWith('proj-1', 'LINEAR');
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

      await waitFor(() => {
        expect(mockUnsaveInsight).toHaveBeenCalledWith('ins-1');
      });
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
      expect(screen.getByText('CLAUDE_CODE')).toBeInTheDocument();
    });

    it('hides section when no specs', () => {
      render(<SavedInsights />);

      expect(screen.queryByText('Generated Specs')).not.toBeInTheDocument();
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

    it('collapse hides full content', () => {
      mockUseSpecs.mockReturnValue({
        specs: [fakeSpec],
        loading: false,
        error: null,
        meta: null,
        refetch: mockRefetchSpecs,
      });

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
      fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));

      expect(screen.queryByRole('button', { name: 'Copy to Clipboard' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    });
  });

  describe('Copy to clipboard', () => {
    it('writes content and shows success toast', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      mockUseSpecs.mockReturnValue({
        specs: [fakeSpec],
        loading: false,
        error: null,
        meta: null,
        refetch: mockRefetchSpecs,
      });

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
      fireEvent.click(screen.getByRole('button', { name: 'Copy to Clipboard' }));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('# Auth Improvements\n\nDetailed spec content here.');
      });
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Copied to clipboard',
        });
      });
    });
  });

  describe('Export markdown', () => {
    it('creates download link and triggers click', () => {
      const mockClick = vi.fn();
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fake');
      const mockRevokeObjectURL = vi.fn();
      globalThis.URL.createObjectURL = mockCreateObjectURL;
      globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

      mockUseSpecs.mockReturnValue({
        specs: [fakeSpec],
        loading: false,
        error: null,
        meta: null,
        refetch: mockRefetchSpecs,
      });

      render(<SavedInsights />);

      fireEvent.click(screen.getByRole('button', { name: 'Expand' }));

      // Mock createElement and DOM methods AFTER render so React isn't affected
      const origCreateElement = document.createElement.bind(document);
      const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const el = origCreateElement('a');
          el.click = mockClick;
          return el;
        }
        return origCreateElement(tag);
      });
      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

      fireEvent.click(screen.getByRole('button', { name: 'Export Markdown' }));

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake');

      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });
  });

  describe('Category filtering', () => {
    it('only shows categories matching user interests', () => {
      mockUseInterests.mockReturnValue({
        interests: [{ id: 'i-1', category: 'DEVTOOLS', createdAt: new Date() }],
        loading: false,
        updating: false,
        error: null,
        updateInterests: vi.fn(),
        refetch: vi.fn(),
      });

      render(<SavedInsights />);

      const categorySelect = screen.getByDisplayValue('Select category...');
      const options = categorySelect.querySelectorAll('option');
      const optionValues = Array.from(options).map((o) => o.getAttribute('value'));

      expect(optionValues).toContain('DEVTOOLS');
      expect(optionValues).not.toContain('FINTECH');
      expect(optionValues).not.toContain('GAMING');
    });
  });
});
