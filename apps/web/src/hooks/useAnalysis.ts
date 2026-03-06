import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useSpecGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSpec = useCallback(
    async (projectIdOrInsightIds: string | string[], format: string = 'MARKDOWN') => {
      setLoading(true);
      setError(null);
      try {
        const body = Array.isArray(projectIdOrInsightIds)
          ? { insightIds: projectIdOrInsightIds, format }
          : { projectId: projectIdOrInsightIds, format };
        const res = await api.post<unknown>('/specs/generate', body);
        if (res.error) throw new Error(res.error.message);
        return res.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Spec generation failed';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { generateSpec, loading, error };
}
