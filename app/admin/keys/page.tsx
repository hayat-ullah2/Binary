"use client";

import { useMemo, useState } from "react";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  MoreVertical,
  Power,
  PowerOff,
  Ban,
  Trash2,
  CircleCheck,
  CircleSlash,
  Clock,
  ShieldX,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import {
  FilterToolbar,
  SearchInput,
  SelectFilter,
  ResetFiltersButton,
} from "@/components/shared/filter-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableRowSkeleton } from "@/components/shared/loading-skeleton";
import { AdminFrame } from "@/components/admin/admin-frame";
import { cn, formatDate } from "@/lib/utils";
import { useLicenseKeys } from "@/lib/hooks/use-license-keys";
import { LICENSE_PLANS, type LicenseKey, type LicensePlan, type LicenseStatus } from "@/types/admin";

const STATUS_META: Record<
  LicenseStatus,
  { label: string; variant: "positive" | "secondary" | "warning" | "negative" }
> = {
  ACTIVE: { label: "Active", variant: "positive" },
  INACTIVE: { label: "Inactive", variant: "secondary" },
  EXPIRED: { label: "Expired", variant: "warning" },
  REVOKED: { label: "Revoked", variant: "negative" },
};

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Revoked", value: "REVOKED" },
];

const PLAN_OPTIONS = [
  { label: "All plans", value: "all" },
  ...LICENSE_PLANS.map((p) => ({ label: p, value: p })),
];

export default function LicenseKeysPage() {
  const { keys, loading, createKey, setStatus, removeKey } = useLicenseKeys();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  const [genOpen, setGenOpen] = useState(false);
  const [confirm, setConfirm] = useState<
    | { kind: "revoke" | "delete"; id: string; label: string }
    | null
  >(null);

  const stats = useMemo(() => {
    const active = keys.filter((k) => k.status === "ACTIVE").length;
    const expired = keys.filter((k) => k.status === "EXPIRED").length;
    const revoked = keys.filter((k) => k.status === "REVOKED").length;
    const activations = keys.reduce((s, k) => s + k.activations, 0);
    return { total: keys.length, active, expired, revoked, activations };
  }, [keys]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return keys.filter((k) => {
      if (statusFilter !== "all" && k.status !== statusFilter) return false;
      if (planFilter !== "all" && k.plan !== planFilter) return false;
      if (q) {
        const hay = `${k.key} ${k.label} ${k.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [keys, search, statusFilter, planFilter]);

  const hasFilters =
    search.trim() !== "" || statusFilter !== "all" || planFilter !== "all";
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPlanFilter("all");
  };

  const confirmLabel = confirm?.label ?? "";

  return (
    <AdminFrame>
      <div className="space-y-6">
      <PageHeader
        title="License Keys"
        description="Generate and manage bot activation keys. Users enter a key to activate the trading bot — revoke or expire access here at any time."
        actions={
          <Button size="sm" onClick={() => setGenOpen(true)}>
            <Plus className="size-4" />
            Generate key
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total keys" value={String(stats.total)} icon={KeyRound} iconTone="primary" />
        <StatCard label="Active" value={String(stats.active)} icon={CircleCheck} iconTone="positive" />
        <StatCard label="Expired" value={String(stats.expired)} icon={Clock} iconTone="warning" />
        <StatCard label="Revoked" value={String(stats.revoked)} icon={ShieldX} iconTone="negative" />
      </div>

      {/* Filters */}
      <FilterToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search key, name or email…"
        />
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          ariaLabel="Filter by status"
        />
        <SelectFilter
          value={planFilter}
          onChange={setPlanFilter}
          options={PLAN_OPTIONS}
          ariaLabel="Filter by plan"
        />
        <ResetFiltersButton onReset={resetFilters} show={hasFilters} />
        <Badge variant="secondary" className="tabular-nums lg:ml-auto">
          {filtered.length} shown
        </Badge>
      </FilterToolbar>

      {/* Content */}
      {loading ? (
        <Card>
          <CardContent className="p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={6} />
            ))}
          </CardContent>
        </Card>
      ) : keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No license keys yet"
          description="Generate your first activation key to get started. Each key can be assigned to a user and given a plan and expiry."
          action={
            <Button size="sm" onClick={() => setGenOpen(true)}>
              <Plus className="size-4" />
              Generate key
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CircleSlash}
          title="No keys match your filters"
          description="Try a different status, plan or search term."
          action={
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Key</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Activations</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell>
                        <KeyCell value={k.key} />
                      </TableCell>
                      <TableCell>
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-foreground">{k.label}</p>
                          {k.email && (
                            <p className="text-xs text-muted-foreground">{k.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{k.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={k.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {k.activations}/{k.maxActivations}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(k.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {k.expiresAt ? formatDate(k.expiresAt) : "Never"}
                      </TableCell>
                      <TableCell>
                        <RowActions
                          k={k}
                          onStatus={setStatus}
                          onRevoke={() =>
                            setConfirm({ kind: "revoke", id: k.id, label: k.label })
                          }
                          onDelete={() =>
                            setConfirm({ kind: "delete", id: k.id, label: k.label })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((k) => (
              <Card key={k.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {k.label}
                      </p>
                      {k.email && (
                        <p className="truncate text-xs text-muted-foreground">
                          {k.email}
                        </p>
                      )}
                    </div>
                    <RowActions
                      k={k}
                      onStatus={setStatus}
                      onRevoke={() =>
                        setConfirm({ kind: "revoke", id: k.id, label: k.label })
                      }
                      onDelete={() =>
                        setConfirm({ kind: "delete", id: k.id, label: k.label })
                      }
                    />
                  </div>
                  <KeyCell value={k.key} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{k.plan}</Badge>
                    <StatusBadge status={k.status} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {k.activations}/{k.maxActivations} activations
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground tabular-nums">
                    <span>Created {formatDate(k.createdAt)}</span>
                    <span>
                      Expires {k.expiresAt ? formatDate(k.expiresAt) : "Never"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <GenerateKeyDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        onCreate={createKey}
      />

      <ConfirmationDialog
        open={confirm !== null}
        onOpenChange={(o) => {
          if (!o) setConfirm(null);
        }}
        title={
          confirm?.kind === "delete"
            ? `Delete “${confirmLabel}”?`
            : `Revoke “${confirmLabel}”?`
        }
        description={
          confirm?.kind === "delete"
            ? "This permanently removes the key. The user will no longer be able to activate the bot with it."
            : "The key stays in the list but is marked revoked and can no longer activate the bot."
        }
        confirmLabel={confirm?.kind === "delete" ? "Delete" : "Revoke"}
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "delete") removeKey(confirm.id);
          else setStatus(confirm.id, "REVOKED");
        }}
      />
      </div>
    </AdminFrame>
  );
}

/* ───────────────────────────── Sub-components ───────────────────────────── */

function StatusBadge({ status }: { status: LicenseStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant} className="gap-1.5">
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  );
}

function KeyCell({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const masked = (() => {
    const parts = value.split("-");
    if (parts.length < 2) return "••••••••";
    return `${parts[0]}-••••-••••-${parts[parts.length - 1]}`;
  })();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <code className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground tabular-nums">
        {revealed ? value : masked}
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        aria-label={revealed ? "Hide key" : "Reveal key"}
        onClick={() => setRevealed((r) => !r)}
      >
        {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn("text-muted-foreground", copied && "text-positive")}
        aria-label="Copy key"
        onClick={copy}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

function RowActions({
  k,
  onStatus,
  onRevoke,
  onDelete,
}: {
  k: LicenseKey;
  onStatus: (id: string, status: "ACTIVE" | "INACTIVE" | "REVOKED") => void;
  onRevoke: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Key actions">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {k.status !== "ACTIVE" && k.status !== "REVOKED" && (
          <DropdownMenuItem onClick={() => onStatus(k.id, "ACTIVE")}>
            <Power />
            Activate
          </DropdownMenuItem>
        )}
        {k.status === "ACTIVE" && (
          <DropdownMenuItem onClick={() => onStatus(k.id, "INACTIVE")}>
            <PowerOff />
            Deactivate
          </DropdownMenuItem>
        )}
        {k.status !== "REVOKED" && (
          <DropdownMenuItem onClick={onRevoke} className="text-negative focus:text-negative">
            <Ban />
            Revoke
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-negative focus:text-negative">
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GenerateKeyDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (input: {
    label?: string;
    email?: string;
    plan?: LicensePlan;
    maxActivations?: number;
  }) => Promise<LicenseKey | null>;
}) {
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<LicensePlan>("Monthly");
  const [maxActivations, setMaxActivations] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setLabel("");
    setEmail("");
    setPlan("Monthly");
    setMaxActivations("1");
  };

  const submit = async () => {
    setSubmitting(true);
    await onCreate({
      label: label.trim() || undefined,
      email: email.trim() || undefined,
      plan,
      maxActivations: Math.max(1, Number(maxActivations) || 1),
    });
    setSubmitting(false);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate license key</DialogTitle>
          <DialogDescription>
            A new activation key is created instantly. Expiry follows the plan
            (Trial 7d · Monthly 30d · Quarterly 90d · Lifetime never).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="k-label">Name / reference</Label>
            <Input
              id="k-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Ahmed Khan"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="k-email">Email (optional)</Label>
            <Input
              id="k-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-plan">Plan</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as LicensePlan)}>
              <SelectTrigger id="k-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_PLANS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-max">Max activations</Label>
            <Input
              id="k-max"
              type="number"
              min={1}
              value={maxActivations}
              onChange={(e) => setMaxActivations(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <KeyRound className="size-4" />
            {submitting ? "Generating…" : "Generate key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
