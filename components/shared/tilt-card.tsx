"use client";

import { useRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight 3D tilt on hover. Writes the transform straight to the DOM node
 * (no React state → no re-renders), GPU-composited via will-change — so it stays
 * smooth even with many cards on screen.
 */
export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: React.ReactNode;
  className?: string;
  /** Max tilt in degrees. */
  max?: number;
}) {
  const innerRef = useRef<HTMLDivElement>(null);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = innerRef.current;
    if (!el) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (0.5 - py) * max * 2;
    const ry = (px - 0.5) * max * 2;
    el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.015)`;
  };

  const onLeave = () => {
    const el = innerRef.current;
    if (el) el.style.transform = "";
  };

  return (
    <div
      className={cn("h-full [perspective:1000px]", className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div
        ref={innerRef}
        className="h-full transition-transform duration-200 ease-out [transform-style:preserve-3d] will-change-transform motion-reduce:transition-none"
      >
        {children}
      </div>
    </div>
  );
}
