/**
 * Banner shown while an admin is signed in as a teacher or parent
 * ("Sign in as" on /admin/people). Sits inside the auth provider.
 */
import type { ReactNode } from 'react';
import { Button } from '@bloomneo/uikit';
import { readImpersonation, stopImpersonation } from '@/features/auth/lib/impersonate';

export function Provider({ children }: { children: ReactNode }) {
  const viewing = readImpersonation();
  return (
    <>
      {viewing && (
        <div role="status" className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-foreground px-4 py-2 text-sm text-background">
          <span className="truncate">Signed in as {viewing.name} (admin view)</span>
          <Button size="sm" variant="secondary" className="h-7 shrink-0" onClick={stopImpersonation}>Return to admin</Button>
        </div>
      )}
      {children}
    </>
  );
}

export const order = 110;
