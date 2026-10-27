/**
 * Answer-page photos, shared by the teacher's and the parent's screens: a
 * thumbnail read through the signed-in call (an <img src> cannot send the
 * token), and a generated sample page for trying the flow without a camera.
 */
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { fetchBlob } from './api';
import type { ApiRoute } from './api-routes';

/** A plain page of lined paper with a title, so a test needs no real photo. */
export function samplePage(): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = 800; c.height = 1100;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#cbd5e1';
  for (let y = 120; y < 1060; y += 40) { g.beginPath(); g.moveTo(50, y); g.lineTo(750, y); g.stroke(); }
  g.fillStyle = '#334155'; g.font = '28px sans-serif';
  g.fillText('Sample answer page (for testing)', 50, 80);
  return new Promise((resolve) => c.toBlob((b) => resolve(b!), 'image/png'));
}

/** `base` is the submission's pages route, for example `/api/parent/submissions/<id>/pages`. */
export function PageThumb({ base, n }: { base: string; n: number }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let revoke: string | null = null;
    let live = true;
    fetchBlob(`${base}/${n}` as ApiRoute).then((b) => {
      if (!live) return;
      revoke = URL.createObjectURL(b);
      setUrl(revoke);
    }).catch(() => undefined);
    return () => { live = false; if (revoke) URL.revokeObjectURL(revoke); };
  }, [base, n]);
  return url
    ? <img src={url} alt={`Answer page ${n + 1}`} className="h-28 w-20 rounded-md border border-border object-cover" />
    : <div className="grid h-28 w-20 place-items-center rounded-md border border-border bg-muted"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>;
}
