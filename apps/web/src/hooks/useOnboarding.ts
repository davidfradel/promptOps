import { useState, useEffect, useCallback } from 'react';
import type { CategoryInfo } from '@promptops/shared';
import { api } from '../lib/api.js';

export function useOnboarding() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<CategoryInfo[]>('/categories')
      .then((res) => setCategories(res.data ?? []))
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false));
  }, []);

  const submitOnboarding = useCallback(async (selectedCategories: string[]) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/onboarding', { categories: selectedCategories });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { categories, loading, submitting, error, submitOnboarding };
}
