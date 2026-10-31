import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Direction, SignalStatus } from "@/types/forex";

export function SignalBadge({
  direction,
  size = "default",
  className,
}: {
  direction: Direction;
  size?: "default" | "sm";
  className?: string;
}) {
  const isBuy = direction === "BUY";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-semibold tracking-wide",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
        isBuy
          ? "bg-positive-muted text-positive"
          : "bg-negative-muted text-negative",
        className
      )}
    >
      {isBuy ? (
        <ArrowUpRight className={size === "sm" ? "size-3" : "size-3.5"} />
      ) : (
        <ArrowDownRight className={size === "sm" ? "size-3" : "size-3.5"} />
      )}
      {direction}
    </span>
  );
}

const STATUS_CONFIG: Record<
  SignalStatus,
  { label: string; variant: "default" | "positive" | "negative" | "warning" | "secondary" | "info" }
> = {
  ACTIVE: { label: "Active", variant: "info" },
  PENDING: { label: "Pending", variant: "warning" },
  TARGET_HIT: { label: "Target Hit", variant: "positive" },
  STOP_HIT: { label: "Stop Loss Hit", variant: "negative" },
  EXPIRED: { label: "Expired", variant: "secondary" },
};

export function SignalStatusBadge({
  status,
  className,
}: {
  status: SignalStatus;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge variant={cfg.variant} className={className}>
      {status === "ACTIVE" && (
        <span className="mr-0.5 inline-flex size-1.5 rounded-full bg-current" />
      )}
      {cfg.label}
    </Badge>
  );
}
