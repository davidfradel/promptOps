import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompetitorMatrix } from './CompetitorMatrix';
import type { Insight } from '@promptops/shared';

function makeInsight(overrides: Partial<Insight>): Insight {
  return {
    id: '1',
    projectId: 'p1',
    type: 'COMPETITOR',
    title: 'Test Competitor',
    description: 'desc',
    severity: 0.5,
    confidence: 0.8,
    tags: ['tag1'],
    metadata: { threatLevel: 'MEDIUM' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('CompetitorMatrix', () => {
  it('shows empty state when no insights', () => {
    render(<CompetitorMatrix />);
    expect(screen.getByText(/no competitor data/i)).toBeInTheDocument();
  });

  it('shows empty state with empty array', () => {
    render(<CompetitorMatrix insights={[]} />);
    expect(screen.getByText(/no competitor data/i)).toBeInTheDocument();
  });

  it('shows table with competitor data', () => {
    const insights: Insight[] = [
      makeInsight({
        title: 'Acme Corp',
        confidence: 0.85,
        tags: ['enterprise', 'saas'],
        metadata: { threatLevel: 'HIGH' },
      }),
    ];
    render(<CompetitorMatrix insights={insights} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('filters only COMPETITOR type insights', () => {
    const insights: Insight[] = [
      makeInsight({ id: '1', type: 'PAIN_POINT', title: 'Not a competitor' }),
      makeInsight({
        id: '2',
        type: 'COMPETITOR',
        title: 'Real Competitor',
        tags: ['test'],
        confidence: 0.9,
        metadata: { threatLevel: 'LOW' },
      }),
    ];
    render(<CompetitorMatrix insights={insights} />);
    expect(screen.queryByText('Not a competitor')).not.toBeInTheDocument();
    expect(screen.getByText('Real Competitor')).toBeInTheDocument();
  });

  it('defaults threat level to MEDIUM when metadata is missing', () => {
    const insights: Insight[] = [makeInsight({ metadata: null })];
    render(<CompetitorMatrix insights={insights} />);
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('displays tags as badges', () => {
    const insights: Insight[] = [makeInsight({ tags: ['enterprise', 'saas', 'b2b'] })];
    render(<CompetitorMatrix insights={insights} />);
    expect(screen.getByText('enterprise')).toBeInTheDocument();
    expect(screen.getByText('saas')).toBeInTheDocument();
    expect(screen.getByText('b2b')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    const insights: Insight[] = [makeInsight({})];
    render(<CompetitorMatrix insights={insights} />);
    expect(screen.getByText('Competitor')).toBeInTheDocument();
    expect(screen.getByText('Threat Level')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });
});
