import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TiltCard } from "@/components/shared/tilt-card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Signed delta string, e.g. "+12.4%". Tone inferred unless `trend` given. */
  delta?: string;
  trend?: "up" | "down" | "neutral";
  hint?: string;
  iconTone?: "primary" | "positive" | "negative" | "info" | "warning";
  className?: string;
}

const ICON_TONES = {
  primary: "bg-primary-muted text-primary",
  positive: "bg-positive-muted text-positive",
  negative: "bg-negative-muted text-negative",
  info: "bg-info-muted text-info",
  warning: "bg-warning-muted text-warning",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  trend,
  hint,
  iconTone = "primary",
  className,
}: StatCardProps) {
  const resolvedTrend =
    trend ??
    (delta
      ? delta.startsWith("-")
        ? "down"
        : delta.startsWith("+")
          ? "up"
          : "neutral"
      : "neutral");

  return (
    <TiltCard>
    <Card className={cn("h-full p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        </div>
        {Icon && (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              ICON_TONES[iconTone]
            )}
          >
            <Icon className="size-5" />
          </span>
        )}
      </div>
      {(delta || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
                resolvedTrend === "up" && "bg-positive-muted text-positive",
                resolvedTrend === "down" && "bg-negative-muted text-negative",
                resolvedTrend === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {resolvedTrend === "up" && <TrendingUp className="size-3" />}
              {resolvedTrend === "down" && <TrendingDown className="size-3" />}
              {delta}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
    </TiltCard>
  );
}
