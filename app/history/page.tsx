"use client";

import { useMemo, useState } from "react";
import {
  History as HistoryIcon,
  Percent,
  Coins,
  Scale,
  ArrowDownUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrencyPairBadge } from "@/components/shared/currency-pair-badge";
import { SignalBadge } from "@/components/shared/signal-badge";
import {
  CumulativePipsChart,
  WinLossChart,
} from "@/components/shared/performance-chart";
import {
  FilterToolbar,
  SearchInput,
  SelectFilter,
  ResetFiltersButton,
} from "@/components/shared/filter-toolbar";
import {
  DateRangeFilter,
  RANGE_DAYS,
  type DateRangeValue,
} from "@/components/shared/date-range-filter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CURRENCY_PAIRS, MARKET_NOW, getPair } from "@/lib/mock-data";
import { useHistory } from "@/lib/hooks/use-signals";
import {
  cn,
  formatPrice,
  formatSigned,
  formatDate,
  formatDateTime,
} from "@/lib/utils";
import type { PerformancePoint, SignalOutcome } from "@/types/forex";

const NOW = new Date(MARKET_NOW).getTime();

const OUTCOME_BADGE: Record<
  SignalOutcome,
  { label: string; variant: "positive" | "negative" | "secondary" }
> = {
  WIN: { label: "Win", variant: "positive" },
  LOSS: { label: "Loss", variant: "negative" },
  BREAKEVEN: { label: "Breakeven", variant: "secondary" },
};

/** Tailwind tone class for a signed pip number. */
function pipTone(pips: number): string {
  if (pips > 0) return "text-positive";
  if (pips < 0) return "text-negative";
  return "text-muted-foreground";
}

type SortDir = "asc" | "desc";

export default function SignalHistoryPage() {
  const [range, setRange] = useState<DateRangeValue>("all");
  const [pair, setPair] = useState("all");
  const [direction, setDirection] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [search, setSearch] = useState("");
  const [pipSort, setPipSort] = useState<SortDir | null>(null);

  // History from the database (falls back to demo data inside the hook).
  const { history: historyData } = useHistory();

  const hasFilters =
    range !== "all" ||
    pair !== "all" ||
    direction !== "all" ||
    outcome !== "all" ||
    search.trim() !== "";

  const resetFilters = () => {
    setRange("all");
    setPair("all");
    setDirection("all");
    setOutcome("all");
    setSearch("");
    setPipSort(null);
  };

  // ── Filtered set (drives everything else) ──────────────────────────────
  const filtered = useMemo(() => {
    const rangeDays = RANGE_DAYS[range];
    const cutoff =
      rangeDays === null ? null : NOW - rangeDays * 24 * 3600 * 1000;
    const q = search.trim().toLowerCase();

    return historyData.filter((h) => {
      if (cutoff !== null && new Date(h.closedAt).getTime() < cutoff)
        return false;
      if (pair !== "all" && h.pair !== pair) return false;
      if (direction !== "all" && h.direction !== direction) return false;
      if (outcome !== "all" && h.outcome !== outcome) return false;
      if (q) {
        const p = getPair(h.pair);
        const hay = `${h.pair} ${p.label} ${p.base} ${p.quote}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [historyData, range, pair, direction, outcome, search]);

  // ── Summary stats derived from the filtered set ────────────────────────
  const stats = useMemo(() => {
    const total = filtered.length;
    const wins = filtered.filter((h) => h.outcome === "WIN").length;
    const netPips = filtered.reduce((s, h) => s + h.pips, 0);
    const winRate = total ? (wins / total) * 100 : 0;
    const avgRR = total
      ? filtered.reduce((s, h) => s + h.riskReward, 0) / total
      : 0;
    return {
      total,
      winRate: Number(winRate.toFixed(1)),
      netPips: Number(netPips.toFixed(1)),
      avgRR: Number(avgRR.toFixed(2)),
    };
  }, [filtered]);

  // ── Cumulative pips curve (per-signal, ascending by closedAt) ──────────
  const cumulativeSeries = useMemo<PerformancePoint[]>(() => {
    const asc = [...filtered].sort(
      (a, b) =>
        new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime()
    );
    const out: PerformancePoint[] = [];
    let running = 0;
    for (const h of asc) {
      running = Number((running + h.pips).toFixed(1));
      out.push({
        label: formatDate(h.closedAt),
        wins: h.outcome === "WIN" ? 1 : 0,
        losses: h.outcome === "LOSS" ? 1 : 0,
        pips: h.pips,
        cumulativePips: running,
      });
    }
    return out;
  }, [filtered]);

  // ── Daily win/loss breakdown ───────────────────────────────────────────
  const dailySeries = useMemo<PerformancePoint[]>(() => {
    const byDay = new Map<string, PerformancePoint>();
    for (const h of filtered) {
      // ISO date key (YYYY-MM-DD) sorts correctly in lexical order.
      const key = new Date(h.closedAt).toISOString().slice(0, 10);
      const cur =
        byDay.get(key) ??
        {
          label: formatDate(h.closedAt),
          wins: 0,
          losses: 0,
          pips: 0,
          cumulativePips: 0,
        };
      if (h.outcome === "WIN") cur.wins += 1;
      else if (h.outcome === "LOSS") cur.losses += 1;
      cur.pips = Number((cur.pips + h.pips).toFixed(1));
      byDay.set(key, cur);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, point]) => point);
  }, [filtered]);

  // ── Table rows: default closedAt desc, optional pip sort ───────────────
  const rows = useMemo(() => {
    const list = [...filtered];
    if (pipSort) {
      list.sort((a, b) => (pipSort === "asc" ? a.pips - b.pips : b.pips - a.pips));
    } else {
      list.sort(
        (a, b) =>
          new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
      );
    }
    return list;
  }, [filtered, pipSort]);

  const togglePipSort = () =>
    setPipSort((s) => (s === "desc" ? "asc" : s === "asc" ? null : "desc"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Signal History"
        description="A log of illustrative closed sample signals. Figures below are design-preview results only."
      />

      {/* Summary stats (reflect current filters) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Closed signals"
          value={stats.total.toLocaleString("en-US")}
          icon={HistoryIcon}
          iconTone="info"
          hint="In current view"
        />
        <StatCard
          label="Sample win rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={Percent}
          iconTone="primary"
          hint="Wins ÷ closed"
        />
        <StatCard
          label="Net pips"
          value={formatSigned(stats.netPips, 1)}
          icon={Coins}
          iconTone={stats.netPips >= 0 ? "positive" : "negative"}
          trend={
            stats.netPips > 0 ? "up" : stats.netPips < 0 ? "down" : "neutral"
          }
          hint="Sum of result"
        />
        <StatCard
          label="Avg risk / reward"
          value={`${stats.avgRR.toFixed(2)} : 1`}
          icon={Scale}
          iconTone="warning"
          hint="Mean planned R:R"
        />
      </div>

      {/* Summary charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cumulative pips</CardTitle>
            <CardDescription>
              Running total across closed sample signals, ordered by close
              date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cumulativeSeries.length > 0 ? (
              <CumulativePipsChart data={cumulativeSeries} />
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No data for the selected filters.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wins vs losses</CardTitle>
            <CardDescription>Grouped by close date.</CardDescription>
          </CardHeader>
          <CardContent>
            {dailySeries.length > 0 ? (
              <WinLossChart data={dailySeries} />
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No data for the selected filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <FilterToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search pair…"
        />
        <DateRangeFilter value={range} onChange={setRange} />
        <SelectFilter
          value={pair}
          onChange={setPair}
          ariaLabel="Currency pair"
          placeholder="Pair"
          options={[
            { label: "All pairs", value: "all" },
            ...CURRENCY_PAIRS.map((p) => ({ label: p.label, value: p.symbol })),
          ]}
        />
        <SelectFilter
          value={direction}
          onChange={setDirection}
          ariaLabel="Direction"
          placeholder="Direction"
          options={[
            { label: "All directions", value: "all" },
            { label: "Buy", value: "BUY" },
            { label: "Sell", value: "SELL" },
          ]}
        />
        <SelectFilter
          value={outcome}
          onChange={setOutcome}
          ariaLabel="Outcome"
          placeholder="Outcome"
          options={[
            { label: "All outcomes", value: "all" },
            { label: "Win", value: "WIN" },
            { label: "Loss", value: "LOSS" },
            { label: "Breakeven", value: "BREAKEVEN" },
          ]}
        />
        <ResetFiltersButton onReset={resetFilters} show={hasFilters} />
      </FilterToolbar>

      {/* Results */}
      {rows.length === 0 ? (
        <EmptyState
          title="No closed signals match"
          description="Try widening the date range or clearing one or more filters to see sample results."
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="min-w-0">
              <CardTitle>Closed signals</CardTitle>
              <CardDescription>
                Showing {rows.length} of {historyData.length} sample signals.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-5">
            {/* Desktop / tablet table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Timeframe</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Exit</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        onClick={togglePipSort}
                        className="ml-auto inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground"
                        aria-label="Sort by points"
                      >
                        Points
                        <ArrowDownUp
                          className={cn(
                            "size-3",
                            pipSort ? "text-foreground" : "text-muted-foreground/60"
                          )}
                        />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Closed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((h) => {
                    const p = getPair(h.pair);
                    const ob = OUTCOME_BADGE[h.outcome];
                    return (
                      <TableRow key={h.id}>
                        <TableCell>
                          <CurrencyPairBadge symbol={h.pair} size="sm" />
                        </TableCell>
                        <TableCell>
                          <SignalBadge direction={h.direction} size="sm" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{h.timeframe}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {formatPrice(h.entry, p.decimals)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {formatPrice(h.exit, p.decimals)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ob.variant}>{ob.label}</Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium tabular-nums",
                            pipTone(h.pips)
                          )}
                        >
                          {formatSigned(h.pips, 1)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                          {formatDateTime(h.closedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile stacked cards */}
            <ul className="space-y-3 px-3 md:hidden">
              {rows.map((h) => {
                const p = getPair(h.pair);
                const ob = OUTCOME_BADGE[h.outcome];
                return (
                  <li
                    key={h.id}
                    className="rounded-lg border border-border bg-surface p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <CurrencyPairBadge symbol={h.pair} size="sm" />
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          pipTone(h.pips)
                        )}
                      >
                        {formatSigned(h.pips, 1)} pips
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <SignalBadge direction={h.direction} size="sm" />
                      <Badge variant="outline">{h.timeframe}</Badge>
                      <Badge variant={ob.variant}>{ob.label}</Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Entry</dt>
                        <dd className="tabular-nums text-foreground">
                          {formatPrice(h.entry, p.decimals)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Exit</dt>
                        <dd className="tabular-nums text-foreground">
                          {formatPrice(h.exit, p.decimals)}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-[11px] tabular-nums text-muted-foreground">
                      Closed {formatDateTime(h.closedAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
