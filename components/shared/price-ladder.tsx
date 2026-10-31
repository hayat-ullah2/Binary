import { cn, formatPrice } from "@/lib/utils";
import type { Direction } from "@/types/forex";

/**
 * Horizontal entry/stop/target ladder. The reward zone (entry→target) is
 * shaded emerald, the risk zone (entry→stop) rose. A marker shows the current
 * price when the signal is live.
 */
export function PriceLadder({
  direction,
  entry,
  stopLoss,
  takeProfit,
  currentPrice,
  decimals,
  showMarkerLabel = false,
  className,
}: {
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  currentPrice?: number;
  decimals: number;
  showMarkerLabel?: boolean;
  className?: string;
}) {
  const lo = Math.min(stopLoss, takeProfit, entry, currentPrice ?? entry);
  const hi = Math.max(stopLoss, takeProfit, entry, currentPrice ?? entry);
  const span = hi - lo || 1;
  const pct = (v: number) => ((v - lo) / span) * 100;

  const entryPct = pct(entry);
  const tpPct = pct(takeProfit);

  // Reward zone spans from entry to target; risk zone from stop to entry.
  const rewardLeft = Math.min(entryPct, tpPct);
  const rewardWidth = Math.abs(tpPct - entryPct);
  const slPct = pct(stopLoss);
  const riskLeft = Math.min(entryPct, slPct);
  const riskWidth = Math.abs(slPct - entryPct);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-2 w-full rounded-full bg-muted">
        <div
          className="absolute top-0 h-full bg-negative/40"
          style={{ left: `${riskLeft}%`, width: `${riskWidth}%` }}
        />
        <div
          className="absolute top-0 h-full bg-positive/50"
          style={{ left: `${rewardLeft}%`, width: `${rewardWidth}%` }}
        />
        {/* Stop marker */}
        <Marker pct={slPct} className="bg-negative" />
        {/* Entry marker */}
        <Marker pct={entryPct} className="bg-foreground" />
        {/* Target marker */}
        <Marker pct={tpPct} className="bg-positive" />
        {/* Current price */}
        {currentPrice != null && (
          <div
            className="absolute -top-1 bottom-[-4px] w-0.5 -translate-x-1/2 rounded-full bg-primary"
            style={{ left: `${pct(currentPrice)}%` }}
            title={`Current ${formatPrice(currentPrice, decimals)}`}
          >
            <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary ring-2 ring-card" />
          </div>
        )}
      </div>
      {showMarkerLabel && currentPrice != null && (
        <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
          Current{" "}
          <span className="font-semibold text-primary tabular-nums">
            {formatPrice(currentPrice, decimals)}
          </span>{" "}
          · {direction === "BUY" ? "long" : "short"} setup
        </p>
      )}
    </div>
  );
}

function Marker({ pct, className }: { pct: number; className?: string }) {
  return (
    <span
      className={cn(
        "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
        className
      )}
      style={{ left: `${pct}%` }}
    />
  );
}
