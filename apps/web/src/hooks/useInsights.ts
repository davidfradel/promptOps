import { useState, useEffect, useCallback } from 'react';
import type { Insight, ApiMeta } from '@promptops/shared';
import { api } from '../lib/api';

export function useInsights(projectId?: string) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (projectId) params.set('projectId', projectId);
        if (cursor) params.set('cursor', cursor);
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await api.get<Insight[]>(`/insights${query}`);
        if (res.error) {
          setError(res.error.message);
        } else {
          setInsights(res.data ?? []);
          setMeta(res.meta);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch insights');
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { insights, meta, loading, error, refetch: fetchInsights };
}
