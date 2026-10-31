import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-muted text-primary",
        secondary: "border-border bg-surface-elevated text-muted-foreground",
        positive: "border-transparent bg-positive-muted text-positive",
        negative: "border-transparent bg-negative-muted text-negative",
        warning: "border-transparent bg-warning-muted text-warning",
        info: "border-transparent bg-info-muted text-info",
        outline: "border-border text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
