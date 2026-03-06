import { useState, useEffect, useCallback } from 'react';
import type { DiscoverInsight } from '@promptops/shared';
import { api } from '../lib/api.js';

export interface DiscoverFilters {
  category?: string;
  type?: string;
  minSeverity?: number;
  tag?: string;
  search?: string;
  sort?: 'recent' | 'severity' | 'confidence' | 'relevance';
  dateRange?: '7d' | '30d' | '90d' | 'all';
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
      if (filters.search) params.set('search', filters.search);
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.dateRange) params.set('dateRange', filters.dateRange);
      const query = params.toString();
      const res = await api.get<DiscoverInsight[]>(`/discover${query ? `?${query}` : ''}`);
      setInsights(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [
    filters.category,
    filters.type,
    filters.minSeverity,
    filters.tag,
    filters.search,
    filters.sort,
    filters.dateRange,
  ]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { insights, loading, error, refetch: fetchInsights };
}

export function useDiscoverTags() {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<string[]>('/discover/tags')
      .then((res) => setTags(res.data ?? []))
      .catch(() => setTags([]))
      .finally(() => setLoading(false));
  }, []);

  return { tags, loading };
}

export function useSemanticSearch() {
  const [results, setResults] = useState<DiscoverInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      const res = await api.get<DiscoverInsight[]>(`/discover/semantic?${params.toString()}`);
      setResults(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Semantic search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, loading, error, search, clear };
}
