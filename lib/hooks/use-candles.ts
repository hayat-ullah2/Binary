"use client";

import { useEffect, useMemo, useState } from "react";
import { generateCandles } from "@/lib/mock-data";
import type { Candle, Timeframe } from "@/types/forex";
import type { DataSource } from "./use-quotes";

export interface CandlesState {
  candles: Candle[];
  source: DataSource;
  loading: boolean;
}

/**
 * Fetches live OHLC candles for a symbol/timeframe from /api/candles. The
 * demo candles (deterministic, SSR-safe) are the baseline shown while live
 * data loads or on error; live results are keyed by symbol+timeframe so a
 * symbol change falls back to demo without any synchronous setState in effect.
 */
export function useCandles(symbol: string, timeframe: Timeframe): CandlesState {
  const key = `${symbol}:${timeframe}`;
  const demo = useMemo(
    () => generateCandles(symbol, timeframe, 56),
    [symbol, timeframe]
  );

  const [result, setResult] = useState<{
    key: string;
    candles: Candle[];
    source: "live" | "demo";
  } | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch(
          `/api/candles?symbol=${encodeURIComponent(symbol)}&tf=${timeframe}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as {
          candles: Candle[];
          source: "live" | "demo";
        };
        if (!alive) return;
        setResult({ key, candles: data.candles, source: data.source });
      } catch {
        if (!alive) return;
        setResult({ key, candles: demo, source: "demo" });
      }
    }

    const id = setTimeout(load, 0);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [key, symbol, timeframe, demo]);

  // Only use the live result if it belongs to the current symbol/timeframe.
  const live = result && result.key === key ? result : null;
  return {
    candles: live?.candles ?? demo,
    source: live ? live.source : "loading",
    loading: !live,
  };
}
