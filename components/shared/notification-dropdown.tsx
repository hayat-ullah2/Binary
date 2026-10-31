"use client";

import { useState } from "react";
import {
  Bell,
  TrendingUp,
  Target,
  OctagonAlert,
  Eye,
  Info,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NOTIFICATIONS, MARKET_NOW } from "@/lib/mock-data";
import { timeAgo, cn } from "@/lib/utils";
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

export function NotificationDropdown() {
  const [read, setRead] = useState(false);
  const now = new Date(MARKET_NOW);
  const unread = read ? 0 : NOTIFICATIONS.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          <button
            type="button"
            onClick={() => setRead(true)}
            className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            <Check className="size-3" />
            Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto py-1">
          {NOTIFICATIONS.map((n) => {
            const Icon = ICONS[n.type];
            return (
              <div
                key={n.id}
                className="flex gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                    TONES[n.type]
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {n.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {n.detail}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {timeAgo(n.time, now)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            View all activity
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
