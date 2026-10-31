import { cn } from "@/lib/utils";
import { getPair } from "@/lib/mock-data";

const FLAG: Record<string, string> = {
  EUR: "🇪🇺",
  USD: "🇺🇸",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  AUD: "🇦🇺",
  CHF: "🇨🇭",
  CAD: "🇨🇦",
  NZD: "🇳🇿",
  XAU: "🥇",
};

export function CurrencyPairBadge({
  symbol,
  size = "default",
  showCategory = false,
  className,
}: {
  symbol: string;
  size?: "default" | "sm" | "lg";
  showCategory?: boolean;
  className?: string;
}) {
  const pair = getPair(symbol);
  const dims =
    size === "lg" ? "size-9 text-lg" : size === "sm" ? "size-7 text-xs" : "size-8 text-sm";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex shrink-0 items-center">
        <span
          className={cn(
            "flex items-center justify-center rounded-full border border-border bg-surface-elevated",
            dims
          )}
          aria-hidden="true"
        >
          {FLAG[pair.base] ?? "💱"}
        </span>
        <span
          className={cn(
            "-ml-2.5 flex items-center justify-center rounded-full border border-border bg-surface-elevated ring-2 ring-card",
            dims
          )}
          aria-hidden="true"
        >
          {FLAG[pair.quote] ?? "💱"}
        </span>
      </div>
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            "font-semibold text-foreground",
            size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          {pair.label}
        </p>
        {showCategory && (
          <p className="text-[11px] text-muted-foreground">
            {pair.base}/{pair.quote} · {pair.category}
          </p>
        )}
      </div>
    </div>
  );
}
