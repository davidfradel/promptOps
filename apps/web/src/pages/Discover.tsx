import { useState } from 'react';
import { useDiscover, type DiscoverFilters } from '../hooks/useDiscover';
import { useSaved } from '../hooks/useSaved';
import { useInterests } from '../hooks/useInterests';
import { CATEGORIES } from '@promptops/shared';
import { DiscoverInsightCard } from '../components/discover/DiscoverInsightCard';
import { FilterBar } from '../components/discover/FilterBar';
import { Loading } from '../components/ui/Loading';
import { useToast } from '../hooks/useToast';

export function Discover() {
  const [filters, setFilters] = useState<DiscoverFilters>({});
  const { insights, loading, refetch } = useDiscover(filters);
  const { saveInsight, unsaveInsight } = useSaved();
  const { interests } = useInterests();
  const { addToast } = useToast();

  // Filter CATEGORIES to only show user's interests
  const userCategories = CATEGORIES.filter((c) =>
    interests.some((i) => i.category === c.value),
  );

  const handleSave = async (id: string) => {
    try {
      await saveInsight(id);
      addToast({ type: 'success', message: 'Insight saved!' });
      refetch();
    } catch {
      addToast({ type: 'error', message: 'Failed to save insight' });
    }
  };

  const handleUnsave = async (id: string) => {
    try {
      await unsaveInsight(id);
      addToast({ type: 'info', message: 'Insight removed from saved' });
      refetch();
    } catch {
      addToast({ type: 'error', message: 'Failed to remove insight' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
        <p className="mt-1 text-sm text-gray-500">
          Insights from communities matching your interests
        </p>
      </div>

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        categories={userCategories}
      />

      {loading ? (
        <Loading message="Loading insights..." />
      ) : insights.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">No insights yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            We're scraping communities matching your interests. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <DiscoverInsightCard
              key={insight.id}
              insight={insight}
              onSave={handleSave}
              onUnsave={handleUnsave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
