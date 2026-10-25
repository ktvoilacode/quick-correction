/**
 * /demo/school/earnings — what the tutor has earned from parent packs, the
 * next payout, and who hasn't bought a pack yet. Sample numbers: pricing
 * isn't decided (see data/earnings.ts).
 */
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Button, Badge, toast } from '@bloomneo/uikit';
import { TrendingUp, CalendarClock, Share2, FileText, Sparkles, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { SEO } from '@/shared/SEO';
import { useDemo, STUDENTS, studentById } from '../../data/store';
import { PACK, PAYOUT, MONTHLY, PACKS, MINUTES_SAVED_PER_PAPER, rupees } from '../../data/earnings';
import { fmt } from '../../components/parts';

export default function Earnings() {
  const { papers, submissions } = useDemo();
  const thisMonth = MONTHLY[MONTHLY.length - 1].amount;
  const delta = thisMonth - MONTHLY[MONTHLY.length - 2].amount;
  const total = MONTHLY.reduce((n, m) => n + m.amount, 0);

  const withPack = new Set(PACKS.map((p) => p.studentId));
  const noPack = STUDENTS.filter((s) => !withPack.has(s.id));
  const renewing = PACKS.filter((p) => PACK.papers - p.used <= 2);

  const marked = submissions.filter((s) => s.status === 'evaluated').length;
  const hours = Math.round((marked * MINUTES_SAVED_PER_PAPER) / 60);

  return (
    <>
      <SEO title="Earnings" />
      <PageHeader title="Earnings" description={`Your share of each ${PACK.papers}-paper pack parents buy. Sample numbers.`} />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          {/* This month */}
          <div className="mm-gradient mm-glow rounded-3xl p-5 sm:p-6">
            <p className="text-sm text-white/80">Earned in October</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">{rupees(thisMonth)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
              <TrendingUp className="size-4" />
              {delta > 0 ? `${rupees(delta)} more than last month` : 'Same as last month'} · {rupees(total)} in 6 months
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2.5 text-sm">
              <CalendarClock className="size-4 shrink-0" />
              Next payout {fmt(PAYOUT.date)}, straight to your bank
            </div>
            <div className="mt-4 h-28 text-white">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.8 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.12)' }}
                    formatter={(v: number) => rupees(v)}
                    contentStyle={{ background: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-popover-foreground)' }}
                  />
                  <Bar dataKey="amount" name="Earned" fill="rgba(255,255,255,0.85)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Earn more */}
          {(noPack.length > 0 || renewing.length > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Earn more this month</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {noPack.length > 0 && (
                  <div className="flex flex-col gap-3 rounded-2xl bg-secondary/60 p-4 sm:flex-row sm:items-center">
                    <p className="flex-1 text-sm">
                      <span className="font-medium">{noPack.length} parents haven’t bought a pack yet</span>{' '}
                      <span className="text-muted-foreground">({noPack.map((s) => s.name.split(' ')[0]).join(', ')}). Up to {rupees(noPack.length * PACK.tutorShare)} more.</span>
                    </p>
                    <Button className="shrink-0" onClick={() => toast.success(`Pack link sent to ${noPack.length} parents on WhatsApp`)}>
                      <Share2 className="size-4" /> Share pack link
                    </Button>
                  </div>
                )}
                {renewing.map((p) => (
                  <div key={p.studentId} className="flex flex-col gap-3 rounded-2xl bg-secondary/60 p-4 sm:flex-row sm:items-center">
                    <p className="flex-1 text-sm">
                      <span className="font-medium">{studentById(p.studentId).name.split(' ')[0]}’s pack has {PACK.papers - p.used} papers left</span>{' '}
                      <span className="text-muted-foreground">Remind the parent to renew.</span>
                    </p>
                    <Button variant="outline" className="shrink-0" onClick={() => toast.success(`Renewal reminder sent to ${studentById(p.studentId).parent}`)}>
                      Send reminder
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Packs */}
          <Card>
            <CardHeader><CardTitle className="text-base">Packs bought</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {PACKS.map((p) => {
                  const st = studentById(p.studentId);
                  return (
                    <li key={p.studentId} className="flex items-center gap-3 px-6 py-3 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{st.parent}</span>
                        <span className="block truncate text-xs text-muted-foreground">for {st.name.split(' ')[0]} · {fmt(p.boughtOn)} · {p.used}/{PACK.papers} used</span>
                      </span>
                      <Badge variant="secondary" className="shrink-0">+{rupees(PACK.tutorShare)}</Badge>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Work done */}
          <Card>
            <CardHeader><CardTitle className="text-base">Work done for you</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: FileText, value: papers.length, label: 'Papers made' },
                { icon: Sparkles, value: marked, label: 'Sheets marked' },
                { icon: Clock, value: `~${hours}h`, label: 'Checking saved' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-2xl bg-secondary/60 px-2 py-3">
                  <Icon className="mx-auto size-4 text-primary" />
                  <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
                  <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
