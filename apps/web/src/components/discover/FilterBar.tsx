import type { CategoryInfo } from '@promptops/shared';
import type { DiscoverFilters } from '../../hooks/useDiscover';

interface FilterBarProps {
  filters: DiscoverFilters;
  onFiltersChange: (filters: DiscoverFilters) => void;
  categories: CategoryInfo[];
}

const insightTypes = [
  { value: '', label: 'All types' },
  { value: 'PAIN_POINT', label: 'Pain Points' },
  { value: 'FEATURE_REQUEST', label: 'Feature Requests' },
  { value: 'COMPETITOR', label: 'Competitors' },
  { value: 'TREND', label: 'Trends' },
  { value: 'SENTIMENT', label: 'Sentiment' },
];

export function FilterBar({ filters, onFiltersChange, categories }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.category ?? ''}
        onChange={(e) => onFiltersChange({ ...filters, category: e.target.value || undefined })}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">All categories</option>
        {categories.map((cat) => (
          <option key={cat.value} value={cat.value}>{cat.label}</option>
        ))}
      </select>

      <select
        value={filters.type ?? ''}
        onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || undefined })}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        {insightTypes.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
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
        <option value="1">Medium+</option>
        <option value="2">High+</option>
        <option value="3">Critical+</option>
      </select>
    </div>
  );
}
