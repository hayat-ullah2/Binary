"use client";

import { useEffect, useState } from "react";
import { cn, APP_TIMEZONE, APP_TZ_LABEL } from "@/lib/utils";
import { MARKET_NOW, MARKET_SESSIONS, sessionIsOpen } from "@/lib/mock-data";

/**
 * Shows which Forex sessions are open. Defaults to the fixed demo time for
 * deterministic server render, then switches to the live clock after mount.
 */
export function MarketSessionIndicator({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState<Date>(new Date(MARKET_NOW));
  const [live, setLive] = useState(false);

  useEffect(() => {
    // Switch from the deterministic demo time to the live clock after mount.
    // Deferred into timer callbacks so no setState runs synchronously in the
    // effect body (avoids cascading renders and hydration drift).
    const update = () => {
      setNow(new Date());
      setLive(true);
    };
    const initial = setTimeout(update, 0);
    const id = setInterval(update, 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  const utcHour = now.getUTCHours();
  const openSessions = MARKET_SESSIONS.filter((s) => sessionIsOpen(s, utcHour));
  const anyOpen = openSessions.length > 0;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1",
          className
        )}
      >
        <span className="relative flex size-2">
          <span
            className={cn(
              "absolute inline-flex size-full rounded-full opacity-70",
              anyOpen ? "animate-ping bg-positive" : "bg-muted-foreground"
            )}
          />
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              anyOpen ? "bg-positive" : "bg-muted-foreground"
            )}
          />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {anyOpen
            ? `${openSessions.map((s) => s.name).join(" · ")} open`
            : "Markets closed"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {MARKET_SESSIONS.map((s) => {
        const open = sessionIsOpen(s, utcHour);
        return (
          <div
            key={s.name}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
              open
                ? "border-positive/30 bg-positive-muted"
                : "border-border bg-surface"
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                open ? "bg-positive" : "bg-muted-foreground/50"
              )}
            />
            <div className="leading-tight">
              <p
                className={cn(
                  "text-xs font-semibold",
                  open ? "text-positive" : "text-foreground"
                )}
              >
                {s.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {open ? "Open" : "Closed"}
              </p>
            </div>
          </div>
        );
      })}
      <span className="ml-auto hidden text-[11px] text-muted-foreground tabular-nums sm:block">
        {live ? "Live · " : ""}
        {now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: APP_TIMEZONE,
        })}{" "}
        {APP_TZ_LABEL}
      </span>
    </div>
  );
}
