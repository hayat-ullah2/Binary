import { NextResponse } from "next/server";
import { fetchQuotes, toAppQuote, ALL_SYMBOLS } from "@/lib/twelve-data";
import { QUOTES, QUOTE_MAP, CURRENCY_PAIRS } from "@/lib/mock-data";
import type { Quote } from "@/types/forex";

export const dynamic = "force-dynamic";

/**
 * Live quotes for all tracked pairs. Twelve Data's free tier is ~8 req/min, so
 * we fetch every symbol in ONE batched request and cache the result in-process
 * for 60s. On any error (rate limit, network) we fall back to demo quotes so
 * the UI never breaks.
 */

const TTL_MS = 60_000;

type Payload = {
  quotes: Quote[];
  source: "live" | "demo";
  asOf: string;
  note?: string;
};

let cache: { at: number; payload: Payload } | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json({ ...cache.payload, cached: true });
  }

  try {
    const live = await fetchQuotes(ALL_SYMBOLS);
    if (Object.keys(live).length === 0) throw new Error("empty live response");

    const quotes: Quote[] = CURRENCY_PAIRS.map((p) => {
      const td = live[p.symbol];
      const mock = QUOTE_MAP[p.symbol];
      // Live numbers; reuse the mock sparkline as a decorative mini-trend.
      return td ? toAppQuote(td, mock?.sparkline ?? []) : mock;
    });

    const payload: Payload = {
      quotes,
      source: "live",
      asOf: new Date(now).toISOString(),
    };
    cache = { at: now, payload };
    return NextResponse.json(payload);
  } catch (err) {
    const payload: Payload = {
      quotes: QUOTES,
      source: "demo",
      asOf: new Date(now).toISOString(),
      note: `Live feed unavailable, showing demo data (${(err as Error).message}).`,
    };
    // Short cache so we retry the live feed soon.
    cache = { at: now - (TTL_MS - 15_000), payload };
    return NextResponse.json(payload);
  }
}
