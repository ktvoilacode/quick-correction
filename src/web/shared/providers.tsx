/**
 * Provider registry — COLLECTED from layers, not declared here.
 *
 * ── Why ───────────────────────────────────────────────────────────────────
 * The auth layer needs <AuthProvider> around the router. Without a registry
 * its only option is to ship a whole copy of main.tsx, which then silently
 * discards anything the base adds there — that is a real bug this codebase
 * had: a platform hook added to the base main.tsx never ran in any project
 * with --auth, because auth's copy replaced the file and nothing warned.
 *
 * Each layer instead drops a `provider.<layer>.tsx` exporting a component that
 * takes children. This nests them, so main.tsx never changes again.
 */
import type { ComponentType, ReactNode } from 'react';

export type ProviderComponent = ComponentType<{ children: ReactNode }>;

const modules = import.meta.glob<{ Provider?: ProviderComponent; order?: number }>(
  './provider.*.tsx',
  { eager: true },
);

/*
 * Sorted by `order`, outermost first. Nesting order is observable: a provider
 * that redirects on mount needs router context, so it must sit INSIDE the
 * router. Leave gaps so a later layer can slot between.
 */
const providers = Object.keys(modules)
  .sort()
  .map((k) => ({ Provider: modules[k].Provider, order: modules[k].order ?? 0 }))
  .filter((p): p is { Provider: ProviderComponent; order: number } => Boolean(p.Provider))
  .sort((a, b) => a.order - b.order);

export function Providers({ children }: { children: ReactNode }) {
  return providers.reduceRight(
    (acc, { Provider }) => <Provider>{acc}</Provider>,
    <>{children}</>,
  );
}
