/**
 * /admin/audit — audit log browser + detail drawer.
 * @file src/web/features/admin/pages/audit.tsx
 *
 * List view with filter inputs up top (debounced 300 ms). Clicking any
 * row opens a bottom-anchored Sheet showing the full record — ids,
 * user-agent, IP, and a pretty-printed old → new value diff. The
 * drawer is read-only; mutations happen elsewhere.
 *
 * TODO: Add an "Export CSV" button once auditService.listAudit grows a
 * streaming variant. Today we page-fetch 50 rows at a time.
 *
 * @see ../../../../../docs/admin-patterns.md §4 admin-api, §6 audit, §11 perf
 * @see https://dev.bloomneo.com/adminapp/audit
 *
 * @llm-rule WHEN: Adding new filter fields, exposing more audit columns, or changing the drawer layout
 * @llm-rule AVOID: Synchronous fetch on every keystroke — the 300ms debounce is what keeps the server cool while the admin types
 * @llm-rule NOTE: `actorName` / `actorEmail` are denormalized by audit.service.ts::listAudit — do not add a Prisma relation on audit rows (audit must survive user deletion)
 */

import { memo, useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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

interface AuditRow {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorType: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface Filters {
  action: string;
  entityType: string;
  actorId: string;
}

const EMPTY_FILTERS: Filters = { action: '', entityType: '', actorId: '' };

/**
 * Resolve actorId → display label. `actorName` takes precedence;
 * `actorEmail` is the fallback; 'system' if the event had no user
 * (e.g. a login failure where no user was authenticated); '—' for
 * actors we genuinely can't identify (deleted user whose id still
 * sits in the audit row).
 */
function displayActor(row: AuditRow): string {
  if (row.actorName) return row.actorName;
  if (row.actorEmail) return row.actorEmail;
  if (row.actorType === 'system') return 'system';
  return '—';
}

export default function AdminAudit() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditRow | null>(null);

  // Stable identity so the useEffect below only re-fires when the
  // filter values actually change, not when unrelated state updates
  // happen (selecting a row, error state, etc.).
  const load = useCallback(async (current: Filters) => {
    setError(null);
    try {
      const data = await adminFetchJson<{ items: AuditRow[] }>(
        '/api/audit/list',
        {
          query: {
            action: current.action,
            entityType: current.entityType,
            actorId: current.actorId,
          },
        },
      );
      setRows(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => load(filters), 300);
    return () => clearTimeout(id);
  }, [filters, load]);

  return (
    <>
      <SEO title="Audit log" />
      <AdminPageHeader
        title="Audit log"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit log' }]}
      />
      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Action (e.g. user.update)"
              value={filters.action}
              onChange={(e) =>
                setFilters((f) => ({ ...f, action: e.target.value }))
              }
            />
            <Input
              placeholder="Entity type (e.g. user, setting)"
              value={filters.entityType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, entityType: e.target.value }))
              }
            />
            <Input
              placeholder="Actor ID"
              value={filters.actorId}
              onChange={(e) =>
                setFilters((f) => ({ ...f, actorId: e.target.value }))
              }
            />
            <Button
              variant="outline"
              onClick={() => setFilters(EMPTY_FILTERS)}
              disabled={
                !filters.action && !filters.entityType && !filters.actorId
              }
            >
              Clear filters
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">Failed to load: {error}</p>
          )}

          {!rows ? (
            <PageLoading label="Loading audit events" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No audit events match these filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              {/* Description column removed — most rows don't carry a
                  hand-written description (only password resets, login
                  failures, etc.). When present, it's rendered in the
                  detail drawer alongside the diff. Keeping it out of
                  the table means rows don't have a wall of empty cells.
                  Re-add it if your app fills descriptions for every
                  event. */}
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(r)}
                  >
                    <TableCell className="whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.action}
                    </TableCell>
                    <TableCell>{displayActor(r)}</TableCell>
                    <TableCell>
                      {r.entityType
                        ? `${r.entityType}${r.entityId ? `:${r.entityId}` : ''}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer — slides up from the bottom on mobile, right on
          desktop. Controlled by `selected`; closing resets it. */}
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selected && <AuditDetail row={selected} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Detail renderer for one audit row. Shows identity fields at the top
 * and a pretty-printed JSON block for oldValue/newValue at the bottom.
 * The JSON display intentionally uses plain `<pre>` + text — no JSON
 * tree library — to keep the bundle light. If you end up with huge
 * blobs, swap in react-json-view here.
 *
 * Memoized so re-typing a filter (which updates `filters` state on
 * the parent) doesn't re-render the open drawer's JSON pretty-printer.
 */
const AuditDetail = memo(function AuditDetail({ row }: { row: AuditRow }) {
  const hasDiff = row.oldValue !== null || row.newValue !== null;
  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-mono text-base">{row.action}</SheetTitle>
        <SheetDescription>
          {new Date(row.createdAt).toLocaleString()}
        </SheetDescription>
      </SheetHeader>

      <div className="px-4 pb-6 space-y-4">
        <Field label="Actor">
          <div className="space-y-0.5">
            <div>{displayActor(row)}</div>
            {row.actorId && (
              <div className="font-mono text-xs text-muted-foreground">
                id: {row.actorId}
              </div>
            )}
            {row.actorEmail && row.actorEmail !== displayActor(row) && (
              <div className="text-xs text-muted-foreground">
                {row.actorEmail}
              </div>
            )}
            <Badge variant="secondary" className="mt-1">
              {row.actorType}
            </Badge>
          </div>
        </Field>

        {row.entityType && (
          <Field label="Entity">
            <span className="font-mono text-sm">
              {row.entityType}
              {row.entityId ? `:${row.entityId}` : ''}
            </span>
          </Field>
        )}

        {row.description && (
          <Field label="Description">
            <span>{row.description}</span>
          </Field>
        )}

        {row.ipAddress && (
          <Field label="IP">
            <span className="font-mono text-xs">{row.ipAddress}</span>
          </Field>
        )}

        {row.userAgent && (
          <Field label="User agent">
            <span className="text-xs break-all">{row.userAgent}</span>
          </Field>
        )}

        {hasDiff && (
          <div className="space-y-2 pt-2 border-t">
            <h3 className="text-sm font-medium">Changes</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <JsonBlock label="Before" value={row.oldValue} />
              <JsonBlock label="After" value={row.newValue} />
            </div>
          </div>
        )}
      </div>
    </>
  );
});

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-60 whitespace-pre-wrap break-all">
        {value === null || value === undefined
          ? '—'
          : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
