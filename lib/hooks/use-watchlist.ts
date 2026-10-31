"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_WATCHLIST } from "@/lib/mock-data";

type Source = "db" | "demo" | "loading";

/**
 * Watchlist membership persisted in Neon via /api/watchlist. Mutations are
 * optimistic, then reconciled with the server's returned list.
 */
export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_WATCHLIST);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<Source>("loading");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist", { cache: "no-store" });
      const data = (await res.json()) as { symbols: string[]; source: "db" | "demo" };
      setSymbols(data.symbols);
      setSource(data.source);
    } catch {
      setSource("demo");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await refresh();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  const add = useCallback(async (symbol: string) => {
    setSymbols((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = (await res.json()) as { symbols?: string[] };
      if (data.symbols) setSymbols(data.symbols);
    } catch {
      /* keep optimistic value */
    }
  }, []);

  const remove = useCallback(async (symbol: string) => {
    setSymbols((prev) => prev.filter((s) => s !== symbol));
    try {
      const res = await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { symbols?: string[] };
      if (data.symbols) setSymbols(data.symbols);
    } catch {
      /* keep optimistic value */
    }
  }, []);

  const restore = useCallback(async () => {
    for (const s of DEFAULT_WATCHLIST) {
      await add(s);
    }
  }, [add]);

  return { symbols, loading, source, add, remove, restore, refresh };
}
