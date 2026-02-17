import { useState, useEffect, useCallback } from 'react';
import type { Source } from '@promptops/shared';
import { api } from '../lib/api';

export function useSources(projectId?: string) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<Source[]>(`/sources${query}`);
      if (res.error) {
        setError(res.error.message);
      } else {
        setSources(res.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sources');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const createSource = useCallback(async (data: { projectId: string; platform: string; url: string; config?: Record<string, unknown> }) => {
    const res = await api.post<Source>('/sources', data);
    if (res.error) throw new Error(res.error.message);
    await fetchSources();
    return res.data;
  }, [fetchSources]);

  const deleteSource = useCallback(async (id: string) => {
    const res = await api.delete<{ deleted: boolean }>(`/sources/${id}`);
    if (res.error) throw new Error(res.error.message);
    await fetchSources();
  }, [fetchSources]);

  const triggerScrape = useCallback(async (id: string) => {
    const res = await api.post<unknown>(`/sources/${id}/scrape`, {});
    if (res.error) throw new Error(res.error.message);
    await fetchSources();
    return res.data;
  }, [fetchSources]);

  return { sources, loading, error, refetch: fetchSources, createSource, deleteSource, triggerScrape };
}
