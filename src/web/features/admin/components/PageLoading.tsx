/**
 * PageLoading — delayed loading indicator for admin data fetches.
 * @file src/web/features/admin/components/PageLoading.tsx
 *
 * Shows nothing for the first ~200ms of a loading state, then a
 * centered spinner + "Loading…" label. The delay prevents the
 * "flash-and-disappear" effect on fast local fetches while still
 * giving slow-network users a clear signal that something is in
 * flight.
 *
 * Usage (inside a page that owns its own `loading` state):
 *
 *   const [users, setUsers] = useState<User[] | null>(null);
 *   ...
 *   if (users === null) return <PageLoading label="Loading users" />;
 *
 * Delay is 200 ms by default. Bump via the `delay` prop for slower
 * sections where even 200ms of blank is jarring, or drop to 0 to
 * show it immediately.
 *
 * @see ../../../../../docs/admin-patterns.md §5 loading states
 * @see https://dev.bloomneo.com/adminapp/page-loading
 *
 * @llm-rule WHEN: Any admin page waiting on an API fetch
 * @llm-rule AVOID: Skeletons on admin pages — they flash on fast loads
 * @llm-rule NOTE: Delay below ~150ms is usually counter-productive — the spinner paints and immediately unmounts, reads as a flicker
 */

import { useEffect, useState } from 'react';

interface PageLoadingProps {
  /** Text under the spinner. Defaults to "Loading…". */
  label?: string;
  /** Milliseconds to wait before painting anything. Default 200. */
  delay?: number;
}

export function PageLoading({ label = 'Loading…', delay = 200 }: PageLoadingProps) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const id = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  if (!visible) return null;

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
