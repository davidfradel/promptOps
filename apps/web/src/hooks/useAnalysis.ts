import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerAnalysis = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ jobId: string; projectId: string; status: string }>(
        `/projects/${projectId}/analyze`,
        {},
      );
      if (res.error) throw new Error(res.error.message);
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { triggerAnalysis, loading, error };
}

export function useSpecGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSpec = useCallback(async (projectId: string, format: string = 'MARKDOWN') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<unknown>('/specs/generate', { projectId, format });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Spec generation failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generateSpec, loading, error };
}
