import { useState, useRef } from 'react';
import {
  useDiscover,
  useDiscoverTags,
  useSemanticSearch,
  type DiscoverFilters,
} from '../hooks/useDiscover';
import { useSaved } from '../hooks/useSaved';
import { useInterests } from '../hooks/useInterests';
import { CATEGORIES } from '@promptops/shared';
import { DiscoverInsightCard } from '../components/discover/DiscoverInsightCard';
import { FilterBar } from '../components/discover/FilterBar';
import { Loading } from '../components/ui/Loading';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks/useToast';

export function Discover() {
  const [filters, setFilters] = useState<DiscoverFilters>({});
  const [semanticQuery, setSemanticQuery] = useState('');
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const semanticInputRef = useRef<HTMLInputElement>(null);

  const { insights, loading, refetch } = useDiscover(filters);
  const { tags: availableTags } = useDiscoverTags();
  const { results: semanticResults, loading: semanticLoading, search, clear } = useSemanticSearch();
  const { saveInsight, unsaveInsight } = useSaved();
  const { interests } = useInterests();
  const { addToast } = useToast();

  const userCategories = CATEGORIES.filter((c) => interests.some((i) => i.category === c.value));

  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) return;
    setIsSemanticMode(true);
    await search(semanticQuery);
  };

  const handleClearSemantic = () => {
    setSemanticQuery('');
    setIsSemanticMode(false);
    clear();
  };

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

  const displayedInsights = isSemanticMode ? semanticResults : insights;
  const isLoading = isSemanticMode ? semanticLoading : loading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
        <p className="mt-1 text-sm text-gray-500">
          Insights from communities matching your interests
        </p>
      </div>

      {/* Semantic search bar */}
      <div className="flex gap-2">
        <input
          ref={semanticInputRef}
          type="text"
          placeholder="Ask anything — e.g. 'pricing problems for B2B SaaS'"
          value={semanticQuery}
          onChange={(e) => setSemanticQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSemanticSearch();
          }}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Button
          onClick={() => void handleSemanticSearch()}
          disabled={semanticLoading || !semanticQuery.trim()}
        >
          {semanticLoading ? 'Searching...' : 'Smart Search'}
        </Button>
        {isSemanticMode && (
          <Button variant="ghost" onClick={handleClearSemantic}>
            Clear
          </Button>
        )}
      </div>

      {/* Standard filters (hidden in semantic mode) */}
      {!isSemanticMode && (
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          categories={userCategories}
          availableTags={availableTags}
        />
      )}

      {isSemanticMode && (
        <p className="text-sm text-blue-600">
          Showing semantic results for <strong>"{semanticQuery}"</strong>
        </p>
      )}

      {isLoading ? (
        <Loading message={isSemanticMode ? 'Analyzing your query...' : 'Loading insights...'} />
      ) : displayedInsights.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">No insights found.</p>
          <p className="mt-1 text-sm text-gray-400">
            {isSemanticMode
              ? 'Try rephrasing your query or use the standard filters.'
              : "We're scraping communities matching your interests. Check back soon!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedInsights.map((insight) => (
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
