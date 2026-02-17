import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

interface UserInterest {
  id: string;
  category: string;
  createdAt: Date;
}

export function useInterests() {
  const [interests, setInterests] = useState<UserInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInterests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<UserInterest[]>('/interests');
      setInterests(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  const updateInterests = useCallback(async (add: string[], remove: string[]) => {
    setUpdating(true);
    setError(null);
    try {
      await api.patch('/interests', { add, remove });
      await fetchInterests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update interests');
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [fetchInterests]);

  return { interests, loading, updating, error, updateInterests, refetch: fetchInterests };
}
