import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PainPointsChart } from './PainPointsChart';
import type { Insight } from '@promptops/shared';

// Mock recharts to avoid canvas issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));

function makeInsight(overrides: Partial<Insight> & { type: Insight['type']; tags: string[] }): Insight {
  return {
    id: '1',
    projectId: 'p1',
    title: 'Test',
    description: 'desc',
    severity: 0.5,
    confidence: 0.8,
    metadata: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('PainPointsChart', () => {
  it('shows empty state when no insights prop', () => {
    render(<PainPointsChart />);
    expect(screen.getByText(/no pain point data/i)).toBeInTheDocument();
  });

  it('shows empty state with empty array', () => {
    render(<PainPointsChart insights={[]} />);
    expect(screen.getByText(/no pain point data/i)).toBeInTheDocument();
  });

  it('shows chart when pain point insights exist', () => {
    const insights: Insight[] = [
      makeInsight({ type: 'PAIN_POINT', tags: ['auth', 'login'] }),
    ];
    render(<PainPointsChart insights={insights} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('ignores non-PAIN_POINT insights', () => {
    const insights: Insight[] = [
      makeInsight({ type: 'COMPETITOR', tags: ['comp'] }),
    ];
    render(<PainPointsChart insights={insights} />);
    expect(screen.getByText(/no pain point data/i)).toBeInTheDocument();
  });

  it('renders the card title', () => {
    render(<PainPointsChart />);
    expect(screen.getByText('Pain Points Distribution')).toBeInTheDocument();
  });
});
