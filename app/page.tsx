"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Target,
  Eye,
  Percent,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LiveBadge } from "@/components/shared/live-badge";
import { FadeInUp, Stagger, StaggerItem } from "@/components/shared/motion";
import { CountUp } from "@/components/shared/count-up";
import { authClient } from "@/lib/auth-client";
import { useQuotes } from "@/lib/hooks/use-quotes";
import { MarketSessionIndicator } from "@/components/shared/market-session-indicator";
import dynamic from "next/dynamic";
import { MarketOverview } from "@/components/dashboard/market-overview";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { SignalCard } from "@/components/shared/signal-card";
import { SignalDetailDialog } from "@/components/shared/signal-detail-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ACTIVE_SIGNALS,
  ANALYTICS_SUMMARY,
  DEFAULT_WATCHLIST,
  HISTORY,
  MARKET_NOW,
  SIGNALS,
} from "@/lib/mock-data";
import type { Signal } from "@/types/forex";

const OVERVIEW_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"];

// Code-split the price chart (recharts, ~150KB) — render a skeleton until it
// hydrates so the dashboard shell paints without waiting for the chart lib.
const PriceChart = dynamic(
  () => import("@/components/shared/price-chart").then((m) => m.PriceChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted/40" />
    ),
  }
);

export default function DashboardPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");
  const [activeSignal, setActiveSignal] = useState<Signal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { map: quoteMap, source } = useQuotes();
  const { data: session } = authClient.useSession();
  const firstName =
    session?.user?.name?.trim().split(/\s+/)[0] || "trader";

  const today = useMemo(() => {
    const cutoff = new Date(MARKET_NOW).getTime() - 2 * 86_400_000;
    const recent = HISTORY.filter((h) => new Date(h.closedAt).getTime() >= cutoff);
    const wins = recent.filter((h) => h.outcome === "WIN").length;
    const losses = recent.filter((h) => h.outcome === "LOSS").length;
    return { wins, losses };
  }, []);

  const recentSignals = SIGNALS.slice(0, 4);

  function openSignal(s: Signal) {
    setActiveSignal(s);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <FadeInUp>
        <PageHeader
          title={`Welcome back, ${firstName}`}
          description="Here's your Forex signal overview for today's session."
          actions={
            <>
              <MarketSessionIndicator compact />
              <Button asChild size="sm">
                <Link href="/signals">
                  <Radio className="size-4" />
                  View signals
                </Link>
              </Button>
            </>
          }
        />
      </FadeInUp>

      {/* Summary stats */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Active signals"
            value={<CountUp value={ACTIVE_SIGNALS.length} />}
            icon={Radio}
            iconTone="info"
            delta="+2"
            hint="vs. yesterday"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Sample wins / losses today"
            value={`${today.wins}W · ${today.losses}L`}
            icon={Target}
            iconTone="positive"
            trend="up"
            delta={`${Math.round((today.wins / Math.max(1, today.wins + today.losses)) * 100)}%`}
            hint="sample win rate"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Watchlist pairs"
            value={<CountUp value={DEFAULT_WATCHLIST.length} />}
            icon={Eye}
            iconTone="primary"
            hint="tracked instruments"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Sample win rate"
            value={<CountUp value={ANALYTICS_SUMMARY.winRate} suffix="%" />}
            icon={Percent}
            iconTone="positive"
            delta={`+${ANALYTICS_SUMMARY.netPips.toFixed(0)} pips`}
            hint="last 30 days"
          />
        </StaggerItem>
      </Stagger>

      {/* Market overview */}
      <FadeInUp delay={0.08}>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Market overview</h2>
              <LiveBadge source={source} />
            </div>
            <Link
              href="/watchlist"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
            >
              Open watchlist <ArrowRight className="size-3" />
            </Link>
          </div>
          <MarketOverview
            symbols={OVERVIEW_PAIRS}
            selected={selectedSymbol}
            onSelect={setSelectedSymbol}
            quotes={quoteMap}
          />
        </section>
      </FadeInUp>

      {/* Chart + side column */}
      <FadeInUp delay={0.08} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <PriceChart
              symbol={selectedSymbol}
              height={300}
              quote={quoteMap[selectedSymbol]}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Market sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <MarketSessionIndicator />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed />
            </CardContent>
          </Card>
        </div>
      </FadeInUp>

      {/* Recent signals */}
      <section>
        <FadeInUp className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Recent trading signals
          </h2>
          <Link
            href="/signals"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </FadeInUp>
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recentSignals.map((s) => (
            <StaggerItem key={s.id}>
              <SignalCard signal={s} onSelect={openSignal} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <SignalDetailDialog
        signal={activeSignal}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
