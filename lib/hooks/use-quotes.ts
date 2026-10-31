"use client";

import { useEffect, useState } from "react";
import { QUOTES, QUOTE_MAP } from "@/lib/mock-data";
import type { Quote } from "@/types/forex";

export type DataSource = "live" | "demo" | "loading";

export interface QuotesState {
  quotes: Quote[];
  map: Record<string, Quote>;
  source: DataSource;
  asOf: string | null;
  loading: boolean;
}

function toMap(quotes: Quote[]): Record<string, Quote> {
  return Object.fromEntries(quotes.map((q) => [q.symbol, q]));
}

/**
 * Polls /api/quotes for live prices (batched + server-cached). Starts from the
 * deterministic demo quotes so the first render matches SSR (no hydration
 * drift), then swaps to live data after mount and refreshes on an interval.
 */
export function useQuotes(pollMs = 60_000): QuotesState {
  const [state, setState] = useState<QuotesState>({
    quotes: QUOTES,
    map: QUOTE_MAP,
    source: "loading",
    asOf: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/quotes", { cache: "no-store" });
        const data = (await res.json()) as {
          quotes: Quote[];
          source: "live" | "demo";
          asOf: string;
        };
        if (!alive) return;
        setState({
          quotes: data.quotes,
          map: toMap(data.quotes),
          source: data.source,
          asOf: data.asOf,
          loading: false,
        });
      } catch {
        if (!alive) return;
        setState((s) => ({ ...s, source: "demo", loading: false }));
      }
    }

    const first = setTimeout(load, 0);
    const id = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [pollMs]);

  return state;
}
