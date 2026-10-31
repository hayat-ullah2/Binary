"use client";

import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatPrice, timeAgo } from "@/lib/utils";
import { getPair, MARKET_NOW } from "@/lib/mock-data";
import { CurrencyPairBadge } from "./currency-pair-badge";
import { SignalBadge, SignalStatusBadge } from "./signal-badge";
import { RiskRewardBar } from "./risk-reward-card";
import { ConfidenceDots } from "./confidence-meter";
import { Badge } from "@/components/ui/badge";
import type { Signal } from "@/types/forex";

export function SignalsTable({
  signals,
  onSelect,
}: {
  signals: Signal[];
  onSelect?: (signal: Signal) => void;
}) {
  const now = new Date(MARKET_NOW);

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Pair</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead className="text-right">Entry</TableHead>
              <TableHead className="text-right">Stop</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="w-[120px]">R / R</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>TF</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Age</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {signals.map((s) => {
              const pair = getPair(s.pair);
              return (
                <TableRow
                  key={s.id}
                  onClick={() => onSelect?.(s)}
                  className={cn(onSelect && "cursor-pointer")}
                >
                  <TableCell>
                    <CurrencyPairBadge symbol={s.pair} size="sm" />
                  </TableCell>
                  <TableCell>
                    <SignalBadge direction={s.direction} size="sm" />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatPrice(s.entry, pair.decimals)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-negative">
                    {formatPrice(s.stopLoss, pair.decimals)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-positive">
                    {formatPrice(s.takeProfit, pair.decimals)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        1:{s.riskReward.toFixed(1)}
                      </span>
                      <RiskRewardBar riskReward={s.riskReward} height="sm" className="w-14" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ConfidenceDots value={s.confidence} />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {s.confidence}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.timeframe}</Badge>
                  </TableCell>
                  <TableCell>
                    <SignalStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                    {timeAgo(s.createdAt, now)}
                  </TableCell>
                  <TableCell>
                    {onSelect && (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile stacked cards */}
      <div className="space-y-3 md:hidden">
        {signals.map((s) => {
          const pair = getPair(s.pair);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect?.(s)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-border-strong"
            >
              <div className="flex items-center justify-between">
                <CurrencyPairBadge symbol={s.pair} size="sm" />
                <SignalBadge direction={s.direction} size="sm" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Level label="Entry" value={formatPrice(s.entry, pair.decimals)} />
                <Level
                  label="Stop"
                  value={formatPrice(s.stopLoss, pair.decimals)}
                  tone="negative"
                />
                <Level
                  label="Target"
                  value={formatPrice(s.takeProfit, pair.decimals)}
                  tone="positive"
                />
              </div>
              <div className="mt-3">
                <RiskRewardBar riskReward={s.riskReward} height="sm" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <SignalStatusBadge status={s.status} />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{s.timeframe}</Badge>
                  <span className="tabular-nums">1:{s.riskReward.toFixed(1)}</span>
                  <span className="tabular-nums">{timeAgo(s.createdAt, now)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Level({
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
