import {
  TrendingUp,
  Target,
  OctagonAlert,
  Eye,
  Info,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { ACTIVITY, MARKET_NOW } from "@/lib/mock-data";
import type { ActivityItem } from "@/types/forex";

const ICONS = {
  signal: TrendingUp,
  target: Target,
  stop: OctagonAlert,
  watchlist: Eye,
  system: Info,
} as const;

const TONES: Record<ActivityItem["type"], string> = {
  signal: "text-primary bg-primary-muted",
  target: "text-positive bg-positive-muted",
  stop: "text-negative bg-negative-muted",
  watchlist: "text-info bg-info-muted",
  system: "text-muted-foreground bg-muted",
};

export function ActivityFeed() {
  const now = new Date(MARKET_NOW);
  return (
    <ol className="relative space-y-1">
      {ACTIVITY.map((item, i) => {
        const Icon = ICONS[item.type];
        const last = i === ACTIVITY.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-1">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  TONES[item.type]
                )}
              >
                <Icon className="size-4" />
              </span>
              {!last && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="min-w-0 flex-1 pb-3">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.detail}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/70 tabular-nums">
                {timeAgo(item.time, now)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
