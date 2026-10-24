/**
 * bloomneo — web entry.
 *
 * The provider tree is fixed and order-sensitive. Mount each of these exactly
 * once: ToastProvider and ConfirmProvider warn in development if duplicated,
 * and produce doubled behaviour in production if you ignore that.
 *
 *   ThemeProvider     owns the `theme-*` and light/dark classes on <html>
 *     TooltipProvider shared timing for every tooltip in the app
 *       ToastProvider self-closing sibling, renders the toast viewport
 *         ConfirmProvider  wraps children, backs `useConfirm()`
 *
 * `theme={brand.themeId}` is what activates `.theme-bloomneo` from
 * styles/brand.css. Setting that class on <html> by hand does NOT work —
 * ThemeProvider strips any `theme-*` class it did not set itself.
 *
 * ── Layouts ──────────────────────────────────────────────────────────────
 * PageRouter takes a `layouts` list. Each entry is a matcher plus a shell
 * that renders <Outlet />; matched pages mount inside it and the shell stays
 * mounted across navigation. First match wins, so order from most specific to
 * least. Here one shell covers everything:
 *
 *   { match: () => true, Layout: AppLayoutRoute }
 *
 * To give a section its own chrome — a marketing site and an admin console
 * share almost nothing — add a more specific matcher ABOVE it:
 *
 *   { match: (p) => p.startsWith('/admin'), Layout: AdminLayoutRoute },
 *   { match: () => true,                    Layout: AppLayoutRoute },
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, ToastProvider, ConfirmProvider, TooltipProvider } from '@bloomneo/uikit';

import './styles/index.css';
import { brand } from '@/shared/brand';
import { layouts } from '@/shared/layouts';
import { PageRouter } from '@/lib/page-router';
import { Providers } from '@/shared/providers';
import { reportClientError, installGlobalErrorReporting } from '@/shared/reportError';

/*
 * Native platform wiring, if a platform layer provided any.
 *
 * Globbed rather than imported so the base does not depend on a layer that may
 * not be installed — a bare `import './shared/mobile'` would fail the build of
 * every web-only project. Vite resolves this at BUILD time, so with no mobile
 * layer the object is empty and the whole branch is eliminated.
 */
const platformModules = import.meta.glob<{ initNative?: (isDark: boolean) => Promise<void> }>(
  './shared/mobile.ts',
  { eager: true },
);

for (const mod of Object.values(platformModules)) {
  // Fire and forget: the app must paint whether or not the status bar cooperates.
  void mod.initNative?.(document.documentElement.classList.contains('dark'));
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found in index.html');

/*
 * Catch what the render boundary cannot see: errors thrown outside render, and
 * promise rejections nobody handled. Installed before the first render so a
 * crash during startup is still reported.
 */
installGlobalErrorReporting();

createRoot(rootEl).render(
  <React.StrictMode>
    <ThemeProvider theme={brand.themeId} mode="light">
      <TooltipProvider delayDuration={200}>
        <ToastProvider />
        <ConfirmProvider>
          <BrowserRouter>
            {/* Layer-contributed providers (auth, etc). Inside BrowserRouter
                because some of them redirect and need router context. */}
            <Providers>
              <PageRouter
                layouts={layouts}
                /*
                 * PageRouter has always accepted this and no template ever
                 * passed one, so a render crash called nothing and the only
                 * other trace was a dev-only console line. In production a page
                 * could throw, blank out, and leave no record anywhere.
                 */
                onError={(error, info) =>
                  reportClientError({
                    source: 'render',
                    message: error.message,
                    stack: error.stack,
                    componentStack: info.componentStack ?? undefined,
                  })
                }
              />
            </Providers>
          </BrowserRouter>
        </ConfirmProvider>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>
);
