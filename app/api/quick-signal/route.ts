import { NextResponse } from "next/server";
import {
  deterministicQuickSignal,
  analyzeQuickCandles,
  intervalForExpiry,
  quickWindowMs,
  type QuickSignal,
} from "@/lib/quick-signal";
import { fetchQuickCandles } from "@/lib/twelve-data";
import { fetchTradingViewRating } from "@/lib/tradingview-rating";

export const dynamic = "force-dynamic";

type Source = "tradingview" | "live" | "illustrative";

/**
 * Current Quick Signal for a pair + timeframe.
 * - Sub-minute expiries (< 60s): deterministic illustrative call (no real
 *   sub-minute data on the free tier).
 * - 1m and longer: REAL analysis (EMA 9/21 + RSI + MACD) of live Twelve Data
 *   candles, cached per pair + timeframe + window. The analysis is a pure
 *   function of the closed candles, so every device sees the same call.
 * Always illustrative — not financial advice.
 */

const cache = new Map<string, { at: number; signal: QuickSignal; source: Source }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pair = (searchParams.get("pair") ?? "EURUSD").toUpperCase();
  const tf = searchParams.get("tf") ?? "30";
  const tfSeconds = Number(tf) || 60;
  const mode = searchParams.get("mode") === "OTC" ? "OTC" : "LIVE";

  const windowMs = quickWindowMs(tfSeconds);
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const base = { pair, tf, bucket, validForMs: (bucket + 1) * windowMs - now };

  // OTC instruments are synthetic, so their signals are available 24/7.
  // Sub-minute live expiries also use the illustrative signal path.
  if (mode === "OTC" || tfSeconds < 60) {
    const signal = deterministicQuickSignal(
      pair,
      `${mode}:${tfSeconds}`,
      bucket
    );
    return NextResponse.json({ ...signal, ...base, source: "illustrative" });
  }

  // 1m+ → TradingView rating → Twelve Data analysis → deterministic, cached
  // per window so every device shares the same call.
  const key = `${pair}:${tfSeconds}:${bucket}`;
  const hit = cache.get(key);
  if (hit) {
    return NextResponse.json({ ...hit.signal, ...base, source: hit.source, cached: true });
  }

  // 1) TradingView's own technical-analysis rating (unofficial, may fail).
  const tv = await fetchTradingViewRating(pair, tfSeconds);
  if (tv) {
    cache.set(key, { at: now, signal: tv, source: "tradingview" });
    pruneCache(now);
    return NextResponse.json({ ...tv, ...base, source: "tradingview" });
  }

  // 2) Fallback: our own analysis of live Twelve Data candles.
  try {
    const candles = await fetchQuickCandles(pair, intervalForExpiry(tfSeconds), 60);
    const closes = candles.slice(0, -1).map((c) => c.close); // drop forming candle
    const signal = analyzeQuickCandles(closes);
    if (signal) {
      cache.set(key, { at: now, signal, source: "live" });
      pruneCache(now);
      return NextResponse.json({ ...signal, ...base, source: "live" });
    }
  } catch {
    /* fall through to deterministic */
  }

  // 3) Final fallback: deterministic (not cached, so the next call can retry).
  const signal = deterministicQuickSignal(pair, String(tfSeconds), bucket);
  return NextResponse.json({ ...signal, ...base, source: "illustrative" });
}

function pruneCache(now: number) {
  if (cache.size < 64) return;
  for (const [k, v] of cache) {
    if (now - v.at > 20 * 60_000) cache.delete(k);
  }
}
