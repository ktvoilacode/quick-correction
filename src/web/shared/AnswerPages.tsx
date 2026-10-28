/**
 * Answer-page photos, shared by the teacher's and the parent's screens: a
 * thumbnail read through the signed-in call (an <img src> cannot send the
 * token), and a generated sample page for trying the flow without a camera.
 */
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { fetchBlob } from './api';
import type { ApiRoute } from './api-routes';

/**
 * Shrink a phone photo before it is sent: the marker reads images up to 5 MB,
 * and a 12-megapixel photo can be bigger than that. Long side 2000 px keeps
 * handwriting readable. If the browser cannot decode the file (HEIC outside
 * Safari, say) it is sent as it is and the server says if it cannot be read.
 */
export async function prepareImage(file: Blob, longSide = 2000): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, longSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000 && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bitmap.width * scale);
    c.height = Math.round(bitmap.height * scale);
    c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height);
    bitmap.close();
    return await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85));
  } catch {
    return file;
  }
}

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
