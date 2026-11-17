import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a price using a sensible number of decimals for the instrument. */
export function formatPrice(value: number, decimals = 5): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Signed number with a leading + for positives (e.g. "+1.24", "-0.80"). */
export function formatSigned(value: number, decimals = 2): string {
  const fixed = value.toFixed(decimals);
  return value > 0 ? `+${fixed}` : fixed;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${formatSigned(value, decimals)}%`;
}

export function formatCurrency(value: number, currency = "USD"): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCompact(value: number): string {
  return value.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

/** Humanized relative time from an ISO string, e.g. "12m ago", "3h ago". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now.getTime() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * App-wide display timezone (UTC+6, Bangladesh / Asia-Dhaka). Change these two
 * lines to retime the entire app — clocks, signal times, chart and axes all
 * read from here. ("Asia/Kolkata" = India UTC+5:30, "Asia/Karachi" = UTC+5.)
 */
export const APP_TIMEZONE = "Asia/Dhaka";
export const APP_TZ_LABEL = "UTC+6";

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  });
}

/**
 * True on Saturday or Sunday in the app timezone (UTC+6) — the Forex market is
 * closed over the weekend. Timezone-fixed so every device agrees on the day
 * regardless of the visitor's local clock.
 */
export function isWeekend(now: Date = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
  }).format(now);
  return weekday === "Sat" || weekday === "Sun";
}
