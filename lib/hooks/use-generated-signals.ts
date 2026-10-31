"use client";

import { useEffect, useState } from "react";
import type { Signal, Timeframe } from "@/types/forex";
import type { DataSource } from "./use-quotes";

interface GenResult {
  tf: Timeframe;
  signals: Signal[];
  source: "live" | "demo";
  evaluated: number;
}

/**
 * Fetches engine-generated signals for a timeframe from /api/signals/generate.
 * Keyed by timeframe so switching timeframe shows a loading state without any
 * synchronous setState in the effect body.
 */
export function useGeneratedSignals(timeframe: Timeframe) {
  const [result, setResult] = useState<GenResult | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/signals/generate?tf=${timeframe}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          signals: Signal[];
          source: "live" | "demo" | "mixed";
          evaluated: number;
        };
        if (!alive) return;
        setResult({
          tf: timeframe,
          signals: data.signals,
          source: data.source === "mixed" ? "live" : data.source,
          evaluated: data.evaluated,
        });
      } catch {
        if (alive) setResult({ tf: timeframe, signals: [], source: "demo", evaluated: 0 });
      }
    })();
    return () => {
      alive = false;
    };
  }, [timeframe, tick]);

  const current = result && result.tf === timeframe ? result : null;
  const source: DataSource = current ? current.source : "loading";

  return {
    signals: current?.signals ?? [],
    evaluated: current?.evaluated ?? 0,
    source,
    loading: !current,
    refresh: () => setTick((t) => t + 1),
  };
}
