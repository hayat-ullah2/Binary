"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Gauge,
  Scale,
  ArrowLeftRight,
  LayoutGrid,
  Rows3,
  SignalHigh,
  Database,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FilterToolbar,
  SearchInput,
  SelectFilter,
  ResetFiltersButton,
} from "@/components/shared/filter-toolbar";
import { SignalsTable } from "@/components/shared/signals-table";
import { SignalCard } from "@/components/shared/signal-card";
import { SignalDetailDialog } from "@/components/shared/signal-detail-dialog";
import { LiveBadge } from "@/components/shared/live-badge";
import { CardListSkeleton } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CURRENCY_PAIRS, TIMEFRAMES, getPair } from "@/lib/mock-data";
import { useSignals } from "@/lib/hooks/use-signals";
import { useGeneratedSignals } from "@/lib/hooks/use-generated-signals";
import type { Signal, SignalStatus, Timeframe } from "@/types/forex";

type ViewMode = "table" | "cards";
type SignalSource = "saved" | "generated";

const GEN_TF_OPTIONS = TIMEFRAMES.map((t) => ({ label: t, value: t }));

const DIRECTION_OPTIONS = [
  { label: "All directions", value: "all" },
  { label: "BUY", value: "BUY" },
  { label: "SELL", value: "SELL" },
];

const STATUS_OPTIONS: { label: string; value: "all" | SignalStatus }[] = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Pending", value: "PENDING" },
  { label: "Target hit", value: "TARGET_HIT" },
  { label: "Stop hit", value: "STOP_HIT" },
  { label: "Expired", value: "EXPIRED" },
];

const PAIR_OPTIONS = [
  { label: "All pairs", value: "all" },
  ...CURRENCY_PAIRS.map((p) => ({ label: p.label, value: p.symbol })),
];

const TIMEFRAME_OPTIONS = [
  { label: "All timeframes", value: "all" },
  ...TIMEFRAMES.map((t) => ({ label: t, value: t })),
];

export default function SignalsPage() {
  // ── Filter state (use "all" sentinel — never empty string — for Radix Select) ──
  const [search, setSearch] = useState("");
  const [pair, setPair] = useState("all");
  const [direction, setDirection] = useState("all");
  const [timeframe, setTimeframe] = useState("all");
  const [status, setStatus] = useState("all");

  // ── View + dialog state ──
  const [view, setView] = useState<ViewMode>("table");
  const [selected, setSelected] = useState<Signal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Signal source: saved (DB) vs generated live by the rule-based engine.
  const [source, setSource] = useState<SignalSource>("saved");
  const [genTf, setGenTf] = useState<Timeframe>("H1");

  const { signals: savedSignals } = useSignals();
  const {
    signals: genSignals,
    loading: genLoading,
    source: genDataSource,
    refresh: refreshGenerated,
  } = useGeneratedSignals(genTf);

  const signalData = source === "generated" ? genSignals : savedSignals;

  const openSignal = (s: Signal) => {
    setSelected(s);
    setDialogOpen(true);
  };

  // ── Summary stats (illustrative sample data) ──
  const stats = useMemo(() => {
    const total = signalData.length || 1;
    const avgConfidence = Math.round(
      signalData.reduce((sum, s) => sum + s.confidence, 0) / total
    );
    const avgRiskReward =
      signalData.reduce((sum, s) => sum + s.riskReward, 0) / total;
    const buys = signalData.filter((s) => s.direction === "BUY").length;
    const sells = signalData.length - buys;
    const active = signalData.filter(
      (s) => s.status === "ACTIVE" || s.status === "PENDING"
    ).length;
    return { active, avgConfidence, avgRiskReward, buys, sells };
  }, [signalData]);

  // ── Reactive filtering over the signals array ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return signalData.filter((s) => {
      if (q) {
        const p = getPair(s.pair);
        const haystack = `${s.pair} ${p.label} ${p.base} ${p.quote}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (pair !== "all" && s.pair !== pair) return false;
      if (direction !== "all" && s.direction !== direction) return false;
      if (timeframe !== "all" && s.timeframe !== timeframe) return false;
      if (status !== "all" && s.status !== status) return false;
      return true;
    });
  }, [signalData, search, pair, direction, timeframe, status]);

  const hasFilters =
    search.trim() !== "" ||
    pair !== "all" ||
    direction !== "all" ||
    timeframe !== "all" ||
    status !== "all";

  const resetFilters = () => {
    setSearch("");
    setPair("all");
    setDirection("all");
    setTimeframe("all");
    setStatus("all");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Signals"
        description="Active and recently closed trading signals across all tracked pairs — review entries, targets, confidence and risk/reward at a glance. All figures are illustrative sample data."
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            <Badge variant="secondary" className="tabular-nums">
              {filtered.length} shown
            </Badge>
          </>
        }
      />

      {/* Signal source: saved vs engine-generated */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SourceToggle value={source} onChange={setSource} />
          {source === "generated" && <LiveBadge source={genDataSource} />}
        </div>
        {source === "generated" && (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:block">
              Timeframe
            </span>
            <SelectFilter
              value={genTf}
              onChange={(v) => setGenTf(v as Timeframe)}
              options={GEN_TF_OPTIONS}
              ariaLabel="Generation timeframe"
              className="flex-1 sm:w-[120px] sm:flex-none lg:w-[110px]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={refreshGenerated}
              disabled={genLoading}
              className="shrink-0"
            >
              <RefreshCw className={cn("size-4", genLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active signals"
          value={String(stats.active)}
          icon={Activity}
          iconTone="primary"
          hint={`of ${signalData.length} total`}
        />
        <StatCard
          label="Avg. confidence"
          value={`${stats.avgConfidence}%`}
          icon={Gauge}
          iconTone="info"
          hint="across all signals"
        />
        <StatCard
          label="Avg. risk / reward"
          value={`1:${stats.avgRiskReward.toFixed(1)}`}
          icon={Scale}
          iconTone="positive"
          hint="target vs. risk"
        />
        <StatCard
          label="BUY / SELL split"
          value={`${stats.buys} / ${stats.sells}`}
          icon={ArrowLeftRight}
          iconTone="warning"
          hint="long vs. short"
        />
      </div>

      {/* Filters */}
      <FilterToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by pair…"
        />
        <SelectFilter
          value={pair}
          onChange={setPair}
          options={PAIR_OPTIONS}
          ariaLabel="Filter by currency pair"
          placeholder="Pair"
        />
        <SelectFilter
          value={direction}
          onChange={setDirection}
          options={DIRECTION_OPTIONS}
          ariaLabel="Filter by direction"
          placeholder="Direction"
        />
        <SelectFilter
          value={timeframe}
          onChange={setTimeframe}
          options={TIMEFRAME_OPTIONS}
          ariaLabel="Filter by timeframe"
          placeholder="Timeframe"
        />
        <SelectFilter
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          ariaLabel="Filter by status"
          placeholder="Status"
        />
        <ResetFiltersButton onReset={resetFilters} show={hasFilters} />
      </FilterToolbar>

      {/* Results */}
      {source === "generated" && genLoading && genSignals.length === 0 ? (
        <CardListSkeleton count={4} />
      ) : filtered.length === 0 ? (
        source === "generated" && !hasFilters ? (
          <EmptyState
            icon={Cpu}
            title="No qualifying setups right now"
            description={`The engine didn't find a signal meeting its rules on ${genTf}. Try another timeframe or refresh.`}
            action={
              <Button variant="outline" size="sm" onClick={refreshGenerated}>
                <RefreshCw className="size-4" />
                Refresh
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={SignalHigh}
            title="No signals match your filters"
            description="Try a different pair, direction, timeframe or status — or clear the filters to see every signal."
            action={
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        )
      ) : view === "table" ? (
        <SignalsTable signals={filtered} onSelect={openSignal} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SignalCard key={s.id} signal={s} onSelect={openSignal} />
          ))}
        </div>
      )}

      <SignalDetailDialog
        signal={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

function SourceToggle({
  value,
  onChange,
}: {
  value: SignalSource;
  onChange: (v: SignalSource) => void;
}) {
  const options: { value: SignalSource; label: string; icon: typeof Database }[] = [
    { value: "saved", label: "Saved", icon: Database },
    { value: "generated", label: "Generated", icon: Cpu },
  ];
  return (
    <div
      role="group"
      aria-label="Signal source"
      className="flex w-full items-center gap-1 rounded-md border border-border bg-surface p-1 sm:w-auto"
    >
      {options.map((o) => {
        const Icon = o.icon;
        const active = value === o.value;
        return (
          <Button
            key={o.value}
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn("h-7 flex-1 px-2.5 sm:flex-none", !active && "text-muted-foreground")}
          >
            <Icon className="size-4" />
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const options: { value: ViewMode; label: string; icon: typeof Rows3 }[] = [
    { value: "table", label: "Table", icon: Rows3 },
    { value: "cards", label: "Cards", icon: LayoutGrid },
  ];
  return (
    <div
      role="group"
      aria-label="View mode"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1"
    >
      {options.map((o) => {
        const Icon = o.icon;
        const active = value === o.value;
        return (
          <Button
            key={o.value}
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn("h-7 px-2.5", !active && "text-muted-foreground")}
          >
            <Icon className="size-4" />
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}
