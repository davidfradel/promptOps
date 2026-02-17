import { useInsights } from '../hooks/useInsights';
import { InsightsList } from '../components/insights/InsightsList';
import { CompetitorMatrix } from '../components/insights/CompetitorMatrix';

export function Insights() {
  const { insights, loading } = useInsights();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
      <InsightsList insights={insights} loading={loading} />
      <CompetitorMatrix insights={insights} />
    </div>
  );
}
