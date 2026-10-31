"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value up to `value` on mount/change
 * using requestAnimationFrame (easeOutCubic). SSR-safe: renders the final value
 * on the server-less first paint only after mount, starting from 0.
 */
export function CountUp({
  value,
  decimals = 0,
  duration = 900,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {prefix}
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
