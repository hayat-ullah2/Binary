import { cn } from "@/lib/utils";

/**
 * Visual risk/reward bar: red risk segment vs green reward segment, scaled
 * so the two sides reflect the ratio.
 */
export function RiskRewardBar({
  riskReward,
  className,
  height = "default",
}: {
  riskReward: number;
  className?: string;
  height?: "default" | "sm";
}) {
  const rewardShare = Math.min(0.85, Math.max(0.15, riskReward / (riskReward + 1)));
  const riskPct = (1 - rewardShare) * 100;
  const rewardPct = rewardShare * 100;

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex w-full overflow-hidden rounded-full",
          height === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <div
          className="bg-negative/70"
          style={{ width: `${riskPct}%` }}
          aria-hidden="true"
        />
        <div
          className="bg-positive/80"
          style={{ width: `${rewardPct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function RiskRewardCard({
  riskReward,
  riskPips,
  rewardPips,
  className,
}: {
  riskReward: number;
  riskPips: number;
  rewardPips: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-3",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Risk / Reward
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          1:{riskReward.toFixed(2)}
        </span>
      </div>
      <RiskRewardBar riskReward={riskReward} />
      <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums">
        <span className="flex items-center gap-1 text-negative">
          <span className="size-1.5 rounded-full bg-negative" />
          Risk {riskPips} pips
        </span>
        <span className="flex items-center gap-1 text-positive">
          Reward {rewardPips} pips
          <span className="size-1.5 rounded-full bg-positive" />
        </span>
      </div>
    </div>
  );
}
