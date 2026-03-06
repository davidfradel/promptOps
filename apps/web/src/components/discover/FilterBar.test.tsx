import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from './FilterBar';
import type { CategoryInfo } from '@promptops/shared';

const categories: CategoryInfo[] = [
  { value: 'DEVTOOLS', label: 'Dev Tools' },
  { value: 'PRODUCTIVITY', label: 'Productivity' },
];

describe('FilterBar', () => {
  it('renders category, type, severity, sort, and dateRange selects', () => {
    render(
      <FilterBar
        filters={{}}
        onFiltersChange={vi.fn()}
        categories={categories}
        availableTags={[]}
      />,
    );

    expect(screen.getByDisplayValue('All categories')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All types')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Any severity')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Most recent')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All time')).toBeInTheDocument();
  });

  it('renders provided categories as options', () => {
    render(
      <FilterBar
        filters={{}}
        onFiltersChange={vi.fn()}
        categories={categories}
        availableTags={[]}
      />,
    );

    expect(screen.getByRole('option', { name: 'Dev Tools' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Productivity' })).toBeInTheDocument();
  });

  it('calls onFiltersChange with new category when category changes', () => {
    const onFiltersChange = vi.fn();
    render(
      <FilterBar
        filters={{}}
        onFiltersChange={onFiltersChange}
        categories={categories}
        availableTags={[]}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('All categories'), {
      target: { value: 'DEVTOOLS' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ category: 'DEVTOOLS' }));
  });

  it('calls onFiltersChange with undefined category when reset to all', () => {
    const onFiltersChange = vi.fn();
    render(
      <FilterBar
        filters={{ category: 'DEVTOOLS' }}
        onFiltersChange={onFiltersChange}
        categories={categories}
        availableTags={[]}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('Dev Tools'), {
      target: { value: '' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ category: undefined }));
  });

  it('calls onFiltersChange with new type when type changes', () => {
    const onFiltersChange = vi.fn();
    render(
      <FilterBar
        filters={{}}
        onFiltersChange={onFiltersChange}
        categories={categories}
        availableTags={[]}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('All types'), {
      target: { value: 'PAIN_POINT' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'PAIN_POINT' }));
  });

  it('calls onFiltersChange with severity number when severity changes', () => {
    const onFiltersChange = vi.fn();
    render(
      <FilterBar
        filters={{}}
        onFiltersChange={onFiltersChange}
        categories={categories}
        availableTags={[]}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('Any severity'), {
      target: { value: '2' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ minSeverity: 2 }));
  });

  it('calls onFiltersChange with undefined severity when reset to any', () => {
    const onFiltersChange = vi.fn();
    render(
      <FilterBar
        filters={{ minSeverity: 2 }}
        onFiltersChange={onFiltersChange}
        categories={categories}
        availableTags={[]}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('High+ (≥2)'), {
      target: { value: '' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ minSeverity: undefined }),
    );
  });

  it('reflects current filter values in selects', () => {
    render(
      <FilterBar
        filters={{
          category: 'PRODUCTIVITY',
          type: 'TREND',
          minSeverity: 1,
          sort: 'severity',
          dateRange: '30d',
        }}
        onFiltersChange={vi.fn()}
        categories={categories}
        availableTags={[]}
      />,
    );

    expect(screen.getByDisplayValue('Productivity')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Trends')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Medium+ (≥1)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Severity')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Last 30 days')).toBeInTheDocument();
  });

  it('renders tag cloud when tags provided', () => {
    render(
      <FilterBar
        filters={{}}
        onFiltersChange={vi.fn()}
        categories={categories}
        availableTags={['pricing', 'auth', 'mobile']}
      />,
    );

    expect(screen.getByText('#pricing')).toBeInTheDocument();
    expect(screen.getByText('#auth')).toBeInTheDocument();
    expect(screen.getByText('#mobile')).toBeInTheDocument();
  });

  it('calls onFiltersChange with tag when tag clicked', () => {
    const onFiltersChange = vi.fn();
    render(
      <FilterBar
        filters={{}}
        onFiltersChange={onFiltersChange}
        categories={categories}
        availableTags={['pricing']}
      />,
    );

    fireEvent.click(screen.getByText('#pricing'));

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ tag: 'pricing' }));
  });
});
