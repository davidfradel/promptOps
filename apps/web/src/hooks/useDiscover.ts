import { useState, useEffect, useCallback } from 'react';
import type { DiscoverInsight } from '@promptops/shared';
import { api } from '../lib/api.js';

export interface DiscoverFilters {
  category?: string;
  type?: string;
  minSeverity?: number;
  tag?: string;
}

export function useDiscover(filters: DiscoverFilters = {}) {
  const [insights, setInsights] = useState<DiscoverInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.type) params.set('type', filters.type);
      if (filters.minSeverity !== undefined) params.set('minSeverity', String(filters.minSeverity));
      if (filters.tag) params.set('tag', filters.tag);
      const query = params.toString();
      const res = await api.get<DiscoverInsight[]>(`/discover${query ? `?${query}` : ''}`);
      setInsights(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.type, filters.minSeverity, filters.tag]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { insights, loading, error, refetch: fetchInsights };
}
