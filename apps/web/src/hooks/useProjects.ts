import { useState, useEffect, useCallback } from 'react';
import type { Project, ApiMeta } from '@promptops/shared';
import { api } from '../lib/api';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const params = cursor ? `?cursor=${cursor}` : '';
      const res = await api.get<Project[]>(`/projects${params}`);
      if (res.error) {
        setError(res.error.message);
      } else {
        setProjects(res.data ?? []);
        setMeta(res.meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  return { projects, meta, loading, error, refetch: fetchProjects };
}

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const res = await api.get<Project>(`/projects/${id}`);
        if (res.error) {
          setError(res.error.message);
        } else {
          setProject(res.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch project');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  return { project, loading, error };
}
