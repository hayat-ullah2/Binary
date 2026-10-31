import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/hooks/use-quotes";

/**
 * Small indicator showing whether prices are live (Twelve Data) or demo
 * fallback. Pulses green when live.
 */
export function LiveBadge({
  source,
  className,
}: {
  source: DataSource;
  className?: string;
}) {
  const live = source === "live";
  const loading = source === "loading";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        live
          ? "border-positive/30 bg-positive-muted text-positive"
          : loading
            ? "border-border bg-surface text-muted-foreground"
            : "border-warning/30 bg-warning-muted text-warning",
        className
      )}
      title={
        live
          ? "Live prices via Twelve Data"
          : loading
            ? "Loading live prices…"
            : "Live feed unavailable — showing sample data"
      }
    >
      <span className="relative flex size-1.5">
        {live && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-70" />
        )}
        <span
          className={cn(
            "relative inline-flex size-1.5 rounded-full",
            live ? "bg-positive" : loading ? "bg-muted-foreground" : "bg-warning"
          )}
        />
      </span>
      {live ? "Live" : loading ? "Live" : "Sample"}
    </span>
  );
}
