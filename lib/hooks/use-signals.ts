"use client";

import { useEffect, useState } from "react";
import { SIGNALS, HISTORY } from "@/lib/mock-data";
import type { HistorySignal, Signal } from "@/types/forex";

type Source = "db" | "demo" | "loading";

/** Live / recent signals from /api/signals (starts with demo data for SSR). */
export function useSignals() {
  const [signals, setSignals] = useState<Signal[]>(SIGNALS);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<Source>("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/signals", { cache: "no-store" });
        const data = (await res.json()) as { signals: Signal[]; source: "db" | "demo" };
        if (!alive) return;
        setSignals(data.signals);
        setSource(data.source);
      } catch {
        if (alive) setSource("demo");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { signals, loading, source };
}

/** Closed signal history from /api/signals/history. */
export function useHistory() {
  const [history, setHistory] = useState<HistorySignal[]>(HISTORY);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<Source>("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/signals/history", { cache: "no-store" });
        const data = (await res.json()) as {
          history: HistorySignal[];
          source: "db" | "demo";
        };
        if (!alive) return;
        setHistory(data.history);
        setSource(data.source);
      } catch {
        if (alive) setSource("demo");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { history, loading, source };
}
