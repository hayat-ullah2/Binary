"use client";

import { cn, formatPrice, formatPercent, formatSigned } from "@/lib/utils";
import { getPair, QUOTE_MAP } from "@/lib/mock-data";
import { Sparkline } from "@/components/shared/sparkline";
import { TiltCard } from "@/components/shared/tilt-card";
import type { Quote } from "@/types/forex";

export function MarketOverview({
  symbols,
  selected,
  onSelect,
  quotes,
}: {
  symbols: string[];
  selected?: string;
  onSelect?: (symbol: string) => void;
  /** Live quotes map; falls back to demo quotes when omitted. */
  quotes?: Record<string, Quote>;
}) {
  const source = quotes ?? QUOTE_MAP;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {symbols.map((symbol) => {
        const pair = getPair(symbol);
        const q = source[symbol];
        if (!q) return null;
        const up = q.dayChangePercent >= 0;
        const active = selected === symbol;
        return (
          <TiltCard key={symbol} max={5}>
          <button
            type="button"
            onClick={() => onSelect?.(symbol)}
            aria-pressed={active}
            className={cn(
              "flex h-full w-full flex-col rounded-xl border bg-card/80 p-4 text-left transition-all",
              active
                ? "border-primary/50 ring-1 ring-primary/30"
                : "border-border/70 hover:border-border-strong"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                {pair.label}
              </span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                  up ? "bg-positive-muted text-positive" : "bg-negative-muted text-negative"
                )}
              >
                {formatPercent(q.dayChangePercent)}
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {formatPrice(q.bid, pair.decimals)}
                </p>
                <p
                  className={cn(
                    "text-xs tabular-nums",
                    up ? "text-positive" : "text-negative"
                  )}
                >
                  {formatSigned(q.dayChange, pair.decimals)}
                </p>
              </div>
              <Sparkline data={q.sparkline} positive={up} width={88} height={34} />
            </div>
          </button>
          </TiltCard>
        );
      })}
    </div>
  );
}
