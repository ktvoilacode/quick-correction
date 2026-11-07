import * as React from 'react';

/** Load something once (and again on `reload`), with the error message kept for display. */
export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const loadRef = React.useRef(load);
  loadRef.current = load;

  const reload = React.useCallback(async () => {
    setError(null);
    try {
      setData(await loadRef.current());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { setLoading(true); void reload(); }, [reload, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, loading, reload, setData };
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
