import type { Insight } from '@promptops/shared';
import { PainPointCard } from './PainPointCard';
import { Loading } from '../ui/Loading';

interface InsightsListProps {
  insights: Insight[];
  loading: boolean;
}

export function InsightsList({ insights, loading }: InsightsListProps) {
  if (loading) return <Loading message="Loading insights..." />;

  if (insights.length === 0) {
    return <p className="py-8 text-center text-gray-500">No insights found.</p>;
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <PainPointCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
