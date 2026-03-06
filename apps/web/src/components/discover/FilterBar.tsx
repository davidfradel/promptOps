import type { CategoryInfo } from '@promptops/shared';
import type { DiscoverFilters } from '../../hooks/useDiscover';

interface FilterBarProps {
  filters: DiscoverFilters;
  onFiltersChange: (filters: DiscoverFilters) => void;
  categories: CategoryInfo[];
  availableTags: string[];
}

const insightTypes = [
  { value: '', label: 'All types' },
  { value: 'PAIN_POINT', label: 'Pain Points' },
  { value: 'FEATURE_REQUEST', label: 'Feature Requests' },
  { value: 'COMPETITOR', label: 'Competitors' },
  { value: 'TREND', label: 'Trends' },
  { value: 'SENTIMENT', label: 'Sentiment' },
];

const sortOptions = [
  { value: 'recent', label: 'Most recent' },
  { value: 'severity', label: 'Severity' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'relevance', label: 'Relevance' },
];

const dateRangeOptions = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export function FilterBar({ filters, onFiltersChange, categories, availableTags }: FilterBarProps) {
  const activeTag = filters.tag;

  return (
    <div className="space-y-3">
      {/* Row 1: selects */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.category ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, category: e.target.value || undefined })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        <select
          value={filters.type ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || undefined })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {insightTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={filters.minSeverity !== undefined ? String(filters.minSeverity) : ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              minSeverity: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Any severity</option>
          <option value="1">Medium+ (≥1)</option>
          <option value="2">High+ (≥2)</option>
          <option value="3">Critical+ (≥3)</option>
          <option value="4">Urgent only</option>
        </select>

        <select
          value={filters.sort ?? 'recent'}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              sort: e.target.value as DiscoverFilters['sort'],
            })
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={filters.dateRange ?? 'all'}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              dateRange: e.target.value as DiscoverFilters['dateRange'],
            })
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {dateRangeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Text search */}
        <input
          type="text"
          placeholder="Search insights..."
          value={filters.search ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Row 2: tag cloud */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                onFiltersChange({ ...filters, tag: activeTag === tag ? undefined : tag })
              }
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTag === tag
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
