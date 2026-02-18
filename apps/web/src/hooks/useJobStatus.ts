import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';

interface JobState {
  jobId: string | null;
  status: string | null;
  polling: boolean;
}

export function useJobPolling(
  pollUrl: string | null,
  options: {
    interval?: number;
    onComplete?: () => void;
    onFailed?: (error?: string) => void;
  } = {},
) {
  const { interval = 3000, onComplete, onFailed } = options;
  const [state, setState] = useState<JobState>({ jobId: null, status: null, polling: false });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onFailedRef = useRef(onFailed);

  onCompleteRef.current = onComplete;
  onFailedRef.current = onFailed;

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((prev) => ({ ...prev, polling: false }));
  }, []);

  const startPolling = useCallback((jobId: string) => {
    setState({ jobId, status: 'PENDING', polling: true });
  }, []);

  useEffect(() => {
    if (!state.polling || !pollUrl) return;

    const poll = async () => {
      try {
        const res =
          await api.get<Array<{ id: string; status: string; error?: string; postsFound?: number }>>(
            pollUrl,
          );
        if (!res.data || !Array.isArray(res.data)) return;

        const job = state.jobId ? res.data.find((j) => j.id === state.jobId) : res.data[0];

        if (!job) return;

        setState((prev) => ({ ...prev, status: job.status }));

        if (job.status === 'COMPLETED') {
          stopPolling();
          onCompleteRef.current?.();
        } else if (job.status === 'FAILED') {
          stopPolling();
          onFailedRef.current?.(job.error);
        }
      } catch {
        // Silently retry on next interval
      }
    };

    poll();
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.polling, state.jobId, pollUrl, interval, stopPolling]);

  return { ...state, startPolling, stopPolling };
}

export function useSpecPolling(
  specId: string | null,
  options: {
    interval?: number;
    onComplete?: (content: string) => void;
  } = {},
) {
  const { interval = 3000, onComplete } = options;
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  onCompleteRef.current = onComplete;

  const startPolling = useCallback(() => {
    setPolling(true);
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  }, []);

  useEffect(() => {
    if (!polling || !specId) return;

    const poll = async () => {
      try {
        const res = await api.get<{ id: string; content: string; title: string }>(
          `/specs/${specId}`,
        );
        if (res.data && res.data.content !== 'Generating...') {
          stopPolling();
          onCompleteRef.current?.(res.data.content);
        }
      } catch {
        // Silently retry
      }
    };

    poll();
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [polling, specId, interval, stopPolling]);

  return { polling, startPolling, stopPolling };
}
