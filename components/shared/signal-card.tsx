"use client";

import { Clock } from "lucide-react";
import { cn, formatPrice, timeAgo } from "@/lib/utils";
import { getPair, MARKET_NOW } from "@/lib/mock-data";
import { CurrencyPairBadge } from "./currency-pair-badge";
import { SignalBadge, SignalStatusBadge } from "./signal-badge";
import { ConfidenceMeter } from "./confidence-meter";
import { PriceLadder } from "./price-ladder";
import { TiltCard } from "./tilt-card";
import type { Signal } from "@/types/forex";

export function SignalCard({
  signal,
  onSelect,
  compact = false,
  className,
}: {
  signal: Signal;
  onSelect?: (s: Signal) => void;
  compact?: boolean;
  className?: string;
}) {
  const pair = getPair(signal.pair);
  const now = new Date(MARKET_NOW);

  return (
    <TiltCard max={5}>
    <button
      type="button"
      onClick={() => onSelect?.(signal)}
      disabled={!onSelect}
      className={cn(
        "group flex h-full w-full flex-col rounded-xl border border-border/70 bg-card/80 p-4 text-left transition-all",
        onSelect && "hover:border-border-strong hover:shadow-sm",
        "disabled:cursor-default",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <CurrencyPairBadge symbol={signal.pair} size="sm" />
        <div className="flex items-center gap-1.5">
          <SignalBadge direction={signal.direction} size="sm" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <SignalStatusBadge status={signal.status} />
        <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
          <Clock className="size-3" />
          {timeAgo(signal.createdAt, now)}
        </span>
      </div>

      <div className="mt-3">
        <PriceLadder
          direction={signal.direction}
          entry={signal.entry}
          stopLoss={signal.stopLoss}
          takeProfit={signal.takeProfit}
          currentPrice={signal.currentPrice}
          decimals={pair.decimals}
        />
      </div>

      {!compact && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini label="Entry" value={formatPrice(signal.entry, pair.decimals)} />
            <Mini
              label="Stop"
              value={formatPrice(signal.stopLoss, pair.decimals)}
              tone="negative"
            />
            <Mini
              label="Target"
              value={formatPrice(signal.takeProfit, pair.decimals)}
              tone="positive"
            />
          </div>
          <div className="mt-3">
            <ConfidenceMeter value={signal.confidence} />
          </div>
        </>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="rounded-md border border-border px-1.5 py-0.5 font-medium text-muted-foreground">
          {signal.timeframe}
        </span>
        <span className="text-muted-foreground">
          R/R{" "}
          <span className="font-semibold text-foreground tabular-nums">
            1:{signal.riskReward.toFixed(1)}
          </span>
        </span>
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            {signal.rewardPips}
          </span>{" "}
          pip target
        </span>
      </div>
    </button>
    </TiltCard>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg bg-surface py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-xs font-semibold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          !tone && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
