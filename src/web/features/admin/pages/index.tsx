/**
 * /admin — the dashboard home.
 * @file src/web/features/admin/pages/index.tsx
 *
 * Pulls `/api/admin/summary` once on mount and renders:
 *
 *   - Three stat cards (users, 30-day signups, recent events)
 *   - Area chart of daily signups over the last 30 days
 *   - Donut of users by role.level
 *   - Recent-activity table
 *
 * Charts are recharts. recharts lives in the template's package.json
 * (optional peer of uikit) and is tree-shakable, so only the pieces
 * this page imports end up in the bundle.
 *
 * Which stat cards render is gated by `VITE_ADMIN_DASHBOARD_WIDGETS`
 * (defaults to `users,signups,activity`). The server-side summary is
 * always fully computed — cheap indexed queries — and the client
 * decides what to show.
 *
 * TODO: To add a new widget:
 *   1. Extend `AdminSummary` in api/features/admin/admin.service.ts
 *   2. Add a `WidgetXxx` in this file + a case in `renderWidget`
 *   3. Add the key to your `VITE_ADMIN_DASHBOARD_WIDGETS` env var
 *
 * TODO: Hook up real time range filter — today we're fixed to 30 days.
 *
 * @see ../../../../../docs/admin-patterns.md §4 admin-api, §5 loading, §11 perf
 * @see https://dev.bloomneo.com/adminapp/dashboard
 *
 * @llm-rule WHEN: Adding a widget, changing the summary payload, or tweaking chart styling
 * @llm-rule AVOID: useQuery here would be nicer, but staying on useEffect keeps the template free of a React Query dep requirement for readers copying this file
 * @llm-rule NOTE: Widget subcomponents are React.memo'd — keep their prop surface stable (pass primitives / stable arrays) so memoization actually hits
 */

import { memo, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@bloomneo/uikit';
import { SEO } from '@/shared/SEO';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { PageLoading } from '../components/PageLoading';
import { adminFetchJson } from '../lib/admin-api';
import {
  readDashboardWidgets,
  type WidgetKey,
} from '../lib/dashboard-widgets';

interface AdminSummary {
  users: {
    total: number;
    byRole: Array<{ role: string; level: string; count: number }>;
  };
  signups: {
    last30d: number;
    daily: Array<{ day: string; count: number }>;
  };
  activity: {
    recent: Array<{
      id: string;
      actorId: string | null;
      actorName: string | null;
      actorEmail: string | null;
      actorType: string;
      action: string;
      entityType: string | null;
      createdAt: string;
    }>;
  };
}

/**
 * Actor display helper — mirrors the audit page logic so a row looks
 * the same wherever it's rendered (dashboard recent-activity widget,
 * audit detail drawer).
 */
function displayActor(row: AdminSummary['activity']['recent'][number]): string {
  if (row.actorName) return row.actorName;
  if (row.actorEmail) return row.actorEmail;
  if (row.actorType === 'system') return 'system';
  return '—';
}

// Widget list is now dynamic — reads localStorage first (the user's
// choice on the settings page), falls back to the env var, falls back
// to the full default set. Re-read on the `adminapp:widgets-changed`
// custom event so saves on the settings page update the dashboard
// without a reload.

/**
 * Donut slice palette. These map to Tailwind-equivalent hex values
 * so the charts stay readable on light + dark themes without CSS var
 * gymnastics (recharts doesn't pick up CSS vars directly).
 *
 * TODO: Swap to `var(--color-chart1)` once we add a recharts plugin
 * that resolves CSS custom properties at paint time.
 */
/*
 * Charts render WITHOUT animation on purpose.
 *
 * recharts 2.x animates through react-smooth, which is not React 19 compatible:
 * the enter animation never advances, so a <Pie> emits its sector <g> wrappers
 * with no <path> inside and the donut is simply absent — no error, no warning,
 * an empty card. The area chart degrades the same way.
 *
 * `isAnimationActive={false}` skips that path entirely and the geometry is
 * computed directly. A dashboard chart does not need an entrance animation;
 * it needs to be on screen when the page is.
 *
 * Remove these once this layer moves to recharts 3.x, which supports React 19.
 */
const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#f97316', '#10b981', '#f43f5e', '#eab308'];

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<WidgetKey[]>(() =>
    readDashboardWidgets(),
  );

  useEffect(() => {
    let cancelled = false;
    adminFetchJson<AdminSummary>('/api/admin/summary')
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-read widget prefs when the settings page saves.
  useEffect(() => {
    const onChange = () => setWidgets(readDashboardWidgets());
    window.addEventListener('adminapp:widgets-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('adminapp:widgets-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  // Derive once per summary — stat cards read these fields, and the
  // memoized child components compare by reference. Pulling the scalar
  // values here lets us hand each child only what it needs; the child
  // re-renders only when its own number changes.
  const stats = useMemo(() => {
    if (!summary) return null;
    return {
      userTotal: summary.users.total,
      roleCombos: summary.users.byRole.length,
      signups30d: summary.signups.last30d,
      peakLabel: computePeakLabel(summary.signups.daily),
      recentCount: summary.activity.recent.length,
    };
  }, [summary]);

  return (
    <>
      <SEO title="Dashboard" />
      <AdminPageHeader
        title="Dashboard"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Dashboard' }]}
      />

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            Failed to load dashboard: {error}
          </CardContent>
        </Card>
      )}

      {/* One page-level loader until summary resolves. After ~200ms
          of fetching the spinner appears; fast local fetches paint
          the real widgets with no visible load state. */}
      {!summary && !error && <PageLoading label="Loading dashboard" />}

      {/* Top row — compact stat cards. Each card renders based on the
          widget key being present in VITE_ADMIN_DASHBOARD_WIDGETS. */}
      {summary && stats && (
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {widgets.map((key) => renderStatCard(key, stats))}
      </div>
      )}

      {/* Big charts — area chart for signup trend, donut for role mix.
          Hidden if the signups/users widgets are disabled. */}
      {summary && (
      <div className="grid gap-4 lg:grid-cols-5 mb-6">
        {widgets.includes('signups') && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Signups — last 30 days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SignupsAreaChart daily={summary.signups.daily} />
            </CardContent>
          </Card>
        )}
        {widgets.includes('users') && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Users by role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RolesDonut byRole={summary.users.byRole} />
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {/* Recent activity — always visible when the widget is on. */}
      {summary && widgets.includes('activity') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTable recent={summary.activity.recent} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

interface DashStats {
  userTotal: number;
  roleCombos: number;
  signups30d: number;
  peakLabel: string | undefined;
  recentCount: number;
}

function computePeakLabel(
  daily: AdminSummary['signups']['daily'],
): string | undefined {
  const peak = daily.reduce(
    (best, d) => (d.count > best.count ? d : best),
    { day: '', count: -1 },
  );
  return peak.count > 0 ? `Peak: ${peak.count} on ${peak.day}` : 'No signups yet';
}

function renderStatCard(key: string, stats: DashStats) {
  switch (key) {
    case 'users':
      return <StatUsers key={key} stats={stats} />;
    case 'signups':
      return <StatSignups key={key} stats={stats} />;
    case 'activity':
      return <StatActivity key={key} stats={stats} />;
    default:
      return null;
  }
}

const StatCard = memo(function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value ?? '—'}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
});

const StatUsers = memo(function StatUsers({ stats }: { stats: DashStats }) {
  return (
    <StatCard
      label="Active users"
      value={stats.userTotal.toLocaleString()}
      hint={`${stats.roleCombos} role combos`}
    />
  );
});

const StatSignups = memo(function StatSignups({ stats }: { stats: DashStats }) {
  return (
    <StatCard
      label="Signups (30 d)"
      value={stats.signups30d.toLocaleString()}
      hint={stats.peakLabel}
    />
  );
});

const StatActivity = memo(function StatActivity({ stats }: { stats: DashStats }) {
  return (
    <StatCard
      label="Recent events"
      value={stats.recentCount.toLocaleString()}
      hint="Last 5 audit events shown below"
    />
  );
});

/**
 * Area chart for the 30-day signup series. Gradient fill, soft grid,
 * minimal axes — aims to feel like a SaaS admin dashboard rather than
 * an Excel sheet.
 *
 * Memoized: recharts re-lays-out its SVG on every render, which is
 * expensive. With React.memo the chart re-renders only when `daily`
 * actually changes — once per summary fetch, not once per parent
 * render (e.g. when `widgets` toggles).
 */
const SignupsAreaChart = memo(function SignupsAreaChart({
  daily,
}: {
  daily: AdminSummary['signups']['daily'] | undefined;
}) {
  if (!daily) return null;
  if (daily.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        No signups in the last 30 days.
      </p>
    );
  }

  // Only show every 5th day tick to keep the X-axis readable at
  // narrow widths. Full day values are in the tooltip.
  const tickFormatter = (value: string, index: number) =>
    index % 5 === 0 ? value.slice(5) : '';

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer>
        <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="signups-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.5} />
              <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-muted-foreground"
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-popover)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--color-foreground)' }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={CHART_COLORS[0]}
            strokeWidth={2}
            fill="url(#signups-gradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

/**
 * Donut of users grouped by role.level. Slice colors cycle through
 * CHART_COLORS; if you have more role combos than colors the palette
 * repeats (rare — admin apps usually sit at 3–6).
 *
 * Memoized for the same reason as SignupsAreaChart — skip recharts
 * re-layout when only widget toggles changed upstream.
 */
const RolesDonut = memo(function RolesDonut({
  byRole,
}: {
  byRole: AdminSummary['users']['byRole'] | undefined;
}) {
  const data = useMemo(
    () =>
      (byRole ?? []).map((r) => ({
        name: `${r.role}.${r.level}`,
        value: r.count,
      })),
    [byRole],
  );

  if (!byRole) return null;
  if (byRole.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        No users yet.
      </p>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--color-popover)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={32}
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

const ActivityTable = memo(function ActivityTable({
  recent,
}: {
  recent: AdminSummary['activity']['recent'] | undefined;
}) {
  if (!recent) return null;
  if (recent.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recent.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono text-xs">{row.action}</TableCell>
            <TableCell>{displayActor(row)}</TableCell>
            <TableCell>{row.entityType ?? '—'}</TableCell>
            <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});
