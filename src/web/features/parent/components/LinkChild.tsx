/** Enter the invite code the teacher gave you to link your child. */
import * as React from 'react';
import { Button, Input, toast } from '@bloomneo/uikit';
import { Loader2, Link2 } from 'lucide-react';
import { api } from '@/shared/api';

export function LinkChild({ onLinked }: { onLinked: () => void }) {
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    try {
      const r = await api.post<{ child: { name: string } }>('/api/parent/link', { inviteCode: code.trim() });
      toast.success(`${r.child.name} is linked`);
      setCode('');
      onLinked();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not link your child.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input aria-label="Invite code" placeholder="Invite code, e.g. DEMO1A" autoCapitalize="characters" className="font-mono uppercase"
        value={code} onChange={(e) => setCode(e.target.value)} />
      <Button type="submit" disabled={!code.trim() || busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Link</Button>
    </form>
  );
}
