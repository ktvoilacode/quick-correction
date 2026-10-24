/**
 * Layout registry — COLLECTED from layers, not declared here.
 *
 * ── Why a registry ────────────────────────────────────────────────────────
 * A layer that adds a shell needs an entry in this list. If the list were
 * written out here, every layer would have to ship a whole copy of this file
 * to add one line — and those copies drift. Instead each layer drops a
 * `layout.<name>.tsx` exporting its own entries and this merges them.
 *
 * `import.meta.glob` with `eager` resolves at BUILD time, so an uninstalled
 * layer contributes nothing simply by not existing. Adding a shell means
 * adding one file; this one is never edited again.
 */
import type { ComponentType } from 'react';

export type LayoutEntry = {
  /** First match wins, so specific matchers need a lower `order`. */
  match: (pathname: string) => boolean;
  Layout: ComponentType;
  /**
   * Ascending. Leave gaps so a later layer can slot between without
   * renumbering. The catch-all sits at 1000 — anything above it is
   * unreachable, which is a mistake worth making impossible to make quietly.
   */
  order?: number;
};

const modules = import.meta.glob<{ entries?: LayoutEntry[] }>('./layout.*.tsx', { eager: true });

export const layouts: LayoutEntry[] = Object.keys(modules)
  .sort()
  .flatMap((k) => modules[k].entries ?? [])
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
