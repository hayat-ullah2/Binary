import { cn } from "@/lib/utils";

function tone(value: number) {
  if (value >= 75) return { bar: "bg-positive", text: "text-positive", label: "High" };
  if (value >= 60) return { bar: "bg-primary", text: "text-primary", label: "Moderate" };
  return { bar: "bg-warning", text: "text-warning", label: "Low" };
}

export function ConfidenceMeter({
  value,
  showLabel = true,
  className,
}: {
  value: number;
  showLabel?: boolean;
  className?: string;
}) {
  const t = tone(value);
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confidence</span>
          <span className={cn("font-semibold tabular-nums", t.text)}>
            {value}% · {t.label}
          </span>
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Signal confidence"
      >
        <div
          className={cn("h-full rounded-full transition-all", t.bar)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function ConfidenceDots({ value }: { value: number }) {
  const t = tone(value);
  const filled = Math.round(value / 20);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Confidence ${value}%`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i < filled ? t.bar : "bg-muted"
          )}
        />
      ))}
    </span>
  );
}
