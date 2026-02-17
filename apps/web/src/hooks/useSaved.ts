import { useState, useEffect, useCallback } from 'react';
import type { DiscoverInsight } from '@promptops/shared';
import { api } from '../lib/api.js';

export function useSaved() {
  const [savedInsights, setSavedInsights] = useState<DiscoverInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DiscoverInsight[]>('/saved');
      setSavedInsights(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const saveInsight = useCallback(async (insightId: string) => {
    await api.post(`/saved/${insightId}`, {});
    await fetchSaved();
  }, [fetchSaved]);

  const unsaveInsight = useCallback(async (insightId: string) => {
    await api.delete(`/saved/${insightId}`);
    await fetchSaved();
  }, [fetchSaved]);

  return { savedInsights, loading, error, saveInsight, unsaveInsight, refetch: fetchSaved };
}
