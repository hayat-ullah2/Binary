"use client";

import { Clock, Target, OctagonAlert, LogIn, TrendingUp, CircleCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, formatPrice, formatDateTime, timeAgo } from "@/lib/utils";
import { getPair, MARKET_NOW } from "@/lib/mock-data";
import { CurrencyPairBadge } from "./currency-pair-badge";
import { SignalBadge, SignalStatusBadge } from "./signal-badge";
import { ConfidenceMeter } from "./confidence-meter";
import { PriceLadder } from "./price-ladder";
import { RiskRewardCard } from "./risk-reward-card";
import { DemoDataTag } from "./disclaimer-banner";
import type { Signal } from "@/types/forex";

export function SignalDetailDialog({
  signal,
  open,
  onOpenChange,
}: {
  signal: Signal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!signal) return null;
  const pair = getPair(signal.pair);
  const now = new Date(MARKET_NOW);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <CurrencyPairBadge symbol={signal.pair} size="lg" showCategory />
            <SignalBadge direction={signal.direction} />
          </div>
          <DialogTitle className="sr-only">
            {pair.label} {signal.direction} signal detail
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <SignalStatusBadge status={signal.status} />
          <div className="flex items-center gap-2">
            <DemoDataTag />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {timeAgo(signal.createdAt, now)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <PriceLadder
            direction={signal.direction}
            entry={signal.entry}
            stopLoss={signal.stopLoss}
            takeProfit={signal.takeProfit}
            currentPrice={signal.currentPrice}
            decimals={pair.decimals}
            showMarkerLabel
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Level
            icon={LogIn}
            label="Entry"
            value={formatPrice(signal.entry, pair.decimals)}
            tone="neutral"
          />
          <Level
            icon={OctagonAlert}
            label="Stop-loss"
            value={formatPrice(signal.stopLoss, pair.decimals)}
            tone="negative"
            sub={`${signal.riskPips} pips risk`}
          />
          <Level
            icon={Target}
            label="Take-profit"
            value={formatPrice(signal.takeProfit, pair.decimals)}
            tone="positive"
            sub={`${signal.rewardPips} pips reward`}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <RiskRewardCard
            riskReward={signal.riskReward}
            riskPips={signal.riskPips}
            rewardPips={signal.rewardPips}
          />
          <div className="rounded-lg border border-border bg-surface p-3">
            <ConfidenceMeter value={signal.confidence} />
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Timeframe</span>
              <span className="rounded-md border border-border px-1.5 py-0.5 font-medium text-foreground">
                {signal.timeframe}
              </span>
            </div>
            {signal.currentPrice != null && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current price</span>
                <span className="flex items-center gap-1 font-semibold text-primary tabular-nums">
                  <TrendingUp className="size-3" />
                  {formatPrice(signal.currentPrice, pair.decimals)}
                </span>
              </div>
            )}
          </div>
        </div>

        {signal.reasons && signal.reasons.length > 0 ? (
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Why this signal — indicator rules
            </p>
            <ul className="space-y-1.5">
              {signal.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                  <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          signal.note && (
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Analysis note
              </p>
              <p className="text-sm text-foreground/90">{signal.note}</p>
            </div>
          )
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-[11px] text-muted-foreground">
            Issued {formatDateTime(signal.createdAt)} · ID {signal.id}
          </span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Level({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon
          className={cn(
            "size-3.5",
            tone === "positive" && "text-positive",
            tone === "negative" && "text-negative",
            tone === "neutral" && "text-muted-foreground"
          )}
        />
        {label}
      </div>
      <p
        className={cn(
          "mt-1 text-sm font-semibold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "neutral" && "text-foreground"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
