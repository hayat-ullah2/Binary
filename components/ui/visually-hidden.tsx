import * as React from "react";

/** Hides content visually while keeping it available to assistive tech. */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute size-px -m-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]">
      {children}
    </span>
  );
}
