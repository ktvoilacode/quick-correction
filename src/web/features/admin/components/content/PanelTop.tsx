/**
 * The strip at the top of a Content tab: what the tab is for, and its main
 * action. The page title lives on the Content page itself.
 */
import type { ReactNode } from 'react';

export function PanelTop({ description, actions }: { description: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">{description}</p>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
