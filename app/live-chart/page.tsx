"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPair } from "@/lib/mock-data";
import { TradingViewChart } from "@/components/shared/tradingview-chart";

/** App pair → TradingView symbol. Gold maps to OANDA's spot feed. */
const PAIRS = [
  { sym: "EURUSD", tv: "FX:EURUSD" },
  { sym: "GBPUSD", tv: "FX:GBPUSD" },
  { sym: "USDJPY", tv: "FX:USDJPY" },
  { sym: "XAUUSD", tv: "OANDA:XAUUSD" },
  { sym: "AUDUSD", tv: "FX:AUDUSD" },
  { sym: "USDCHF", tv: "FX:USDCHF" },
  { sym: "USDCAD", tv: "FX:USDCAD" },
  { sym: "NZDUSD", tv: "FX:NZDUSD" },
  { sym: "EURJPY", tv: "FX:EURJPY" },
  { sym: "GBPJPY", tv: "FX:GBPJPY" },
];

export default function LiveChartPage() {
  const [active, setActive] = useState(PAIRS[0]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live Chart"
        description="Professional real-time charts powered by TradingView — full indicators, drawing tools and timeframes. Pick a pair to analyze."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            TradingView · live
          </Badge>
        }
      />

      {/* Pair selector — single scrollable row so the chart gets more height */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PAIRS.map((p) => (
          <button
            key={p.sym}
            type="button"
            onClick={() => setActive(p)}
            aria-pressed={active.sym === p.sym}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active.sym === p.sym
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground"
            )}
          >
            {getPair(p.sym).label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-1 sm:p-2">
          <div className="h-[72vh] min-h-[440px] w-full overflow-hidden rounded-lg sm:h-[66vh]">
            <TradingViewChart symbol={active.tv} />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Charts and prices here are provided by TradingView. Your SHARP PRO BOT
        signals and analytics are generated separately by the app&apos;s own engine.
      </p>
    </div>
  );
}
