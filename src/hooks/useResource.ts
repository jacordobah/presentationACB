import { useCallback, useEffect, useRef, useState } from "react";

export interface Resource<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
}

interface ResourceState<T> {
  key: string | null;
  data?: T;
  error?: Error;
}

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

// Loads data for a key and, with pollMs, refreshes it while the page is
// visible. A null key skips loading, which lets callers wait for a dependency.
export function useResource<T>(
  key: string | null,
  load: () => Promise<T>,
  { pollMs }: { pollMs?: number } = {},
): Resource<T> {
  const loadRef = useRef(load);
  const [state, setState] = useState<ResourceState<T>>({ key: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    let timer: number | undefined;

    const run = async () => {
      if (pollMs && document.hidden) return;
      try {
        const data = await loadRef.current();
        if (!cancelled) setState({ key, data });
      } catch (error) {
        if (!cancelled) {
          setState((previous) => ({
            key,
            data: previous.key === key ? previous.data : undefined,
            error: toError(error),
          }));
        }
      }
      if (pollMs && !cancelled) timer = window.setTimeout(run, pollMs);
    };

    const resumeWhenVisible = () => {
      if (document.hidden) return;
      window.clearTimeout(timer);
      void run();
    };

    void run();
    if (pollMs) {
      document.addEventListener("visibilitychange", resumeWhenVisible);
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resumeWhenVisible);
    };
  }, [key, pollMs, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const current = state.key === key;

  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: key !== null && !current,
    reload,
  };
}
