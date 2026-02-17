import { useState, useEffect, useCallback } from 'react';
import type { Spec, ApiMeta } from '@promptops/shared';
import { api } from '../lib/api';

export function useSpecs(projectId?: string) {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecs = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      if (cursor) params.set('cursor', cursor);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<Spec[]>(`/specs${query}`);
      if (res.error) {
        setError(res.error.message);
      } else {
        setSpecs(res.data ?? []);
        setMeta(res.meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch specs');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchSpecs(); }, [fetchSpecs]);

  return { specs, meta, loading, error, refetch: fetchSpecs };
}
