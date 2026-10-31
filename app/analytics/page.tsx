"use client";

import { useMemo, useState } from "react";
import {
  Percent,
  TrendingUp,
  Scale,
  Gauge,
  Radio,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DemoDataTag } from "@/components/shared/disclaimer-banner";
import {
  CumulativePipsChart,
  PerformanceChart,
  RatioDonut,
  HorizontalPipsChart,
} from "@/components/shared/performance-chart";
import {
  DateRangeFilter,
  RANGE_DAYS,
  type DateRangeValue,
} from "@/components/shared/date-range-filter";
import { SelectFilter } from "@/components/shared/filter-toolbar";
import { CurrencyPairBadge } from "@/components/shared/currency-pair-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ANALYTICS_SUMMARY,
  CURRENCY_PAIRS,
  DAILY_PERFORMANCE,
  DIRECTION_PERFORMANCE,
  HISTORY,
  PAIR_PERFORMANCE,
  TIMEFRAME_PERFORMANCE,
  WEEKLY_PERFORMANCE,
  getPair,
} from "@/lib/mock-data";
import { cn, formatSigned } from "@/lib/utils";

const PAIR_OPTIONS = [
  { label: "All pairs", value: "all" },
  ...CURRENCY_PAIRS.map((p) => ({ label: p.label, value: p.symbol })),
];

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRangeValue>("30d");
  const [pair, setPair] = useState<string>("all");
  const [periodMode, setPeriodMode] = useState<"daily" | "weekly">("daily");

  // The date range switches the headline series between the daily and weekly
  // pre-aggregated datasets (<=30d → daily, >30d / all → weekly).
  const days = RANGE_DAYS[range];
  const useWeekly = days === null || days > 30;
  const rangeSeries = useWeekly ? WEEKLY_PERFORMANCE : DAILY_PERFORMANCE;
  const rangeLabel = useWeekly ? "weekly" : "daily";

  // Outcome breakdown derived from the illustrative history.
  const outcomes = useMemo(() => {
    const wins = HISTORY.filter((h) => h.outcome === "WIN").length;
    const losses = HISTORY.filter((h) => h.outcome === "LOSS").length;
    const breakeven = HISTORY.filter((h) => h.outcome === "BREAKEVEN").length;
    return { wins, losses, breakeven, total: HISTORY.length };
  }, []);

  const pairChartData = useMemo(
    () =>
      PAIR_PERFORMANCE.map((p) => ({
        label: getPair(p.pair).label,
        pips: p.pips,
      })),
    []
  );

  const scopedPairRows = useMemo(
    () =>
      pair === "all"
        ? PAIR_PERFORMANCE
        : PAIR_PERFORMANCE.filter((p) => p.pair === pair),
    [pair]
  );

  const periodSeries = periodMode === "weekly" ? WEEKLY_PERFORMANCE : DAILY_PERFORMANCE;

  const maxDirPips = Math.max(
    1,
    ...DIRECTION_PERFORMANCE.map((d) => Math.abs(d.pips))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="A performance snapshot built from internally-consistent sample data — illustrative only."
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} />
            <SelectFilter
              value={pair}
              onChange={setPair}
              options={PAIR_OPTIONS}
              ariaLabel="Currency pair"
              placeholder="All pairs"
              className="lg:w-[150px]"
            />
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sample win rate"
          value={`${ANALYTICS_SUMMARY.winRate}%`}
          icon={Percent}
          iconTone="positive"
          hint={`${outcomes.wins}W · ${outcomes.losses}L sample`}
        />
        <StatCard
          label="Net pips"
          value={formatSigned(ANALYTICS_SUMMARY.netPips, 1)}
          icon={TrendingUp}
          iconTone="primary"
          delta={`${ANALYTICS_SUMMARY.netPips >= 0 ? "+" : ""}${ANALYTICS_SUMMARY.netPips.toFixed(0)}`}
          hint="cumulative sample"
        />
        <StatCard
          label="Avg risk / reward"
          value={`${ANALYTICS_SUMMARY.avgRiskReward.toFixed(2)}R`}
          icon={Scale}
          iconTone="info"
          hint="per sample signal"
        />
        <StatCard
          label="Profit factor"
          value={ANALYTICS_SUMMARY.profitFactor.toFixed(2)}
          icon={Gauge}
          iconTone={ANALYTICS_SUMMARY.profitFactor >= 1 ? "positive" : "negative"}
          hint="gross win / gross loss"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total signals"
          value={String(ANALYTICS_SUMMARY.totalSignals)}
          icon={Radio}
          iconTone="primary"
          hint="in sample history"
        />
        <StatCard
          label="Active signals"
          value={String(ANALYTICS_SUMMARY.activeSignals)}
          icon={Target}
          iconTone="info"
          hint="currently open (sample)"
        />
        <StatCard
          label="Avg confidence"
          value={`${ANALYTICS_SUMMARY.avgConfidence}%`}
          icon={Gauge}
          iconTone="warning"
          hint="model confidence"
        />
        <StatCard
          label="Best pair"
          value={getPair(ANALYTICS_SUMMARY.bestPair).label}
          icon={TrendingUp}
          iconTone="positive"
          hint="top net pips (sample)"
        />
      </div>

      {/* Performance overview — full width */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Performance overview</CardTitle>
            <CardDescription>
              Cumulative pips over the selected range — showing{" "}
              <span className="font-medium text-foreground">{rangeLabel}</span>{" "}
              sample series.
            </CardDescription>
          </div>
          <DemoDataTag />
        </CardHeader>
        <CardContent>
          <CumulativePipsChart data={rangeSeries} height={300} />
        </CardContent>
      </Card>

      {/* Win rate donut + daily/weekly bars */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Win rate</CardTitle>
            <DemoDataTag />
          </CardHeader>
          <CardContent className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
            <RatioDonut
              value={ANALYTICS_SUMMARY.winRate}
              label="Win rate"
              height={200}
            />
            <div className="space-y-2">
              <SubStat
                label="Wins"
                value={outcomes.wins}
                tone="positive"
                total={outcomes.total}
              />
              <SubStat
                label="Losses"
                value={outcomes.losses}
                tone="negative"
                total={outcomes.total}
              />
              <SubStat
                label="Breakeven"
                value={outcomes.breakeven}
                tone="muted"
                total={outcomes.total}
              />
              <div className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground">
                Based on{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {outcomes.total}
                </span>{" "}
                closed sample signals.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Daily / weekly performance</CardTitle>
              <CardDescription>Net pips per period (sample).</CardDescription>
            </div>
            <Tabs
              value={periodMode}
              onValueChange={(v) => setPeriodMode(v as "daily" | "weekly")}
            >
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <PerformanceChart data={periodSeries} height={240} />
          </CardContent>
        </Card>
      </div>

      {/* Currency-pair performance */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Currency-pair performance</CardTitle>
            <CardDescription>
              {pair === "all"
                ? "Net pips by pair across the sample history."
                : `Scoped to ${getPair(pair).label}.`}
            </CardDescription>
          </div>
          <DemoDataTag />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <HorizontalPipsChart data={pairChartData} height={300} />
          <div>
            {scopedPairRows.length === 0 ? (
              <EmptyState
                title="No data for this pair"
                description="Try selecting a different currency pair."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead className="text-right">Signals</TableHead>
                    <TableHead className="text-right">Win rate</TableHead>
                    <TableHead className="text-right">Net pips</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedPairRows.map((p) => (
                    <TableRow
                      key={p.pair}
                      className={cn(pair === p.pair && "bg-surface")}
                    >
                      <TableCell>
                        <CurrencyPairBadge symbol={p.pair} size="sm" />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.signals}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.winRate}%
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          p.pips >= 0 ? "text-positive" : "text-negative"
                        )}
                      >
                        {formatSigned(p.pips, 1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BUY vs SELL comparison */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>BUY vs SELL comparison</CardTitle>
            <CardDescription>
              How long and short sample signals compare.
            </CardDescription>
          </div>
          <DemoDataTag />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {DIRECTION_PERFORMANCE.map((d) => {
            const positiveTone = d.direction === "BUY";
            const losses = d.signals - d.wins;
            return (
              <div
                key={d.direction}
                className={cn(
                  "rounded-lg border p-4",
                  positiveTone
                    ? "border-positive/25 bg-positive-muted/40"
                    : "border-negative/25 bg-negative-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-semibold",
                      positiveTone ? "text-positive" : "text-negative"
                    )}
                  >
                    {positiveTone ? (
                      <ArrowUpRight className="size-4" />
                    ) : (
                      <ArrowDownRight className="size-4" />
                    )}
                    {d.direction}
                  </span>
                  <Badge variant={positiveTone ? "positive" : "negative"}>
                    {d.winRate}% win
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MiniMetric label="Signals" value={String(d.signals)} />
                  <MiniMetric label="Wins / Losses" value={`${d.wins}/${losses}`} />
                  <MiniMetric label="Net pips" value={formatSigned(d.pips, 0)} />
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Net pips</span>
                    <span className="tabular-nums text-foreground">
                      {formatSigned(d.pips, 1)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        positiveTone ? "bg-positive" : "bg-negative"
                      )}
                      style={{
                        width: `${(Math.abs(d.pips) / maxDirPips) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Timeframe performance */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Timeframe performance</CardTitle>
            <CardDescription>
              Sample results broken down by signal timeframe.
            </CardDescription>
          </div>
          <DemoDataTag />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timeframe</TableHead>
                <TableHead className="text-right">Signals</TableHead>
                <TableHead>Win rate</TableHead>
                <TableHead className="text-right">Avg R/R</TableHead>
                <TableHead className="text-right">Net pips</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TIMEFRAME_PERFORMANCE.map((t) => (
                <TableRow key={t.timeframe}>
                  <TableCell>
                    <Badge variant="outline">{t.timeframe}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.signals}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${t.winRate}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                        {t.winRate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.avgRiskReward.toFixed(2)}R
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      t.pips >= 0 ? "text-positive" : "text-negative"
                    )}
                  >
                    {formatSigned(t.pips, 1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SubStat({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "positive" | "negative" | "muted";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const dot =
    tone === "positive"
      ? "bg-positive"
      : tone === "negative"
        ? "bg-negative"
        : "bg-muted-foreground";
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={cn("size-2 rounded-full", dot)} />
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums text-foreground">
        {value}
        <span className="ml-1 text-xs text-muted-foreground">({pct}%)</span>
      </span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background/40 px-2 py-2">
      <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
