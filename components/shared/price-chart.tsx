"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, formatPrice, formatSigned, formatPercent } from "@/lib/utils";
import { getPair, QUOTE_MAP, TIMEFRAMES } from "@/lib/mock-data";
import { useCandles } from "@/lib/hooks/use-candles";
import { CurrencyPairBadge } from "./currency-pair-badge";
import { LiveBadge } from "./live-badge";
import type { Quote, Timeframe } from "@/types/forex";

export function PriceChart({
  symbol,
  height = 300,
  defaultTimeframe = "H1",
  quote: liveQuote,
  className,
}: {
  symbol: string;
  height?: number;
  defaultTimeframe?: Timeframe;
  /** Live quote for the bid/ask footer; falls back to demo quote. */
  quote?: Quote;
  className?: string;
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const pair = getPair(symbol);
  const quote = liveQuote ?? QUOTE_MAP[symbol];
  const { candles, source } = useCandles(symbol, timeframe);

  const data = useMemo(() => {
    return candles.map((c) => ({
      time: c.time,
      price: c.close,
      label: new Date(c.time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }, [candles]);

  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const change = last - first;
  const changePct = first ? (change / first) * 100 : 0;
  const up = change >= 0;
  const color = up ? "var(--positive)" : "var(--negative)";

  const domain = useMemo(() => {
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.15 || max * 0.001;
    return [min - pad, max + pad];
  }, [data]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <CurrencyPairBadge symbol={symbol} size="lg" />
          <div className="leading-tight">
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatPrice(last, pair.decimals)}
            </p>
            <p
              className={cn(
                "text-xs font-medium tabular-nums",
                up ? "text-positive" : "text-negative"
              )}
            >
              {formatSigned(change, pair.decimals)} ({formatPercent(changePct)})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LiveBadge source={source} />
          <div
            role="tablist"
            aria-label="Chart timeframe"
            className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5"
          >
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                role="tab"
                aria-selected={timeframe === tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  timeframe === tf
                    ? "bg-surface-elevated text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`price-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              orientation="right"
              domain={domain}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={64}
              tickFormatter={(v: number) => formatPrice(v, pair.decimals)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { label: string; price: number };
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                    <p className="text-[11px] text-muted-foreground">{p.label}</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatPrice(p.price, pair.decimals)}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill={`url(#price-${symbol})`}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {quote && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs sm:grid-cols-4">
          <Stat label="Bid" value={formatPrice(quote.bid, pair.decimals)} />
          <Stat label="Ask" value={formatPrice(quote.ask, pair.decimals)} />
          <Stat label="Day High" value={formatPrice(quote.dayHigh, pair.decimals)} />
          <Stat label="Day Low" value={formatPrice(quote.dayLow, pair.decimals)} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}
