import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function DisclaimerBanner({
  children,
  className,
  variant = "default",
}: {
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "subtle";
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed",
        variant === "default"
          ? "border-warning/25 bg-warning-muted text-foreground/90"
          : "border-border bg-surface text-muted-foreground",
        className
      )}
    >
      <Info
        className={cn(
          "mt-0.5 size-4 shrink-0",
          variant === "default" ? "text-warning" : "text-muted-foreground"
        )}
      />
      <p>
        {children ?? (
          <>
            <span className="font-medium text-foreground">Important.</span>{" "}
            Trading signals and performance statistics shown are illustrative.
            Live prices may be delayed.
          </>
        )}
      </p>
    </div>
  );
}

export function DemoDataTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-warning" />
      Sample
    </span>
  );
}
