import { NextResponse } from "next/server";
import {
  deterministicQuickSignal,
  analyzeQuickCandles,
  intervalForExpiry,
  quickWindowMs,
  type QuickSignal,
} from "@/lib/quick-signal";
import { fetchQuickCandles } from "@/lib/twelve-data";

export const dynamic = "force-dynamic";

/**
 * Current Quick Signal for a pair + timeframe.
 * - Sub-minute expiries (< 60s): deterministic illustrative call (no real
 *   sub-minute data on the free tier).
 * - 1m and longer: REAL analysis (EMA 9/21 + RSI + MACD) of live Twelve Data
 *   candles, cached per pair + timeframe + window. The analysis is a pure
 *   function of the closed candles, so every device sees the same call.
 * Always illustrative — not financial advice.
 */

const cache = new Map<string, { at: number; signal: QuickSignal }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pair = (searchParams.get("pair") ?? "EURUSD").toUpperCase();
  const tf = searchParams.get("tf") ?? "30";
  const tfSeconds = Number(tf) || 60;

  const windowMs = quickWindowMs(tfSeconds);
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const base = { pair, tf, bucket, validForMs: (bucket + 1) * windowMs - now };

  // Sub-minute → deterministic illustrative signal.
  if (tfSeconds < 60) {
    const signal = deterministicQuickSignal(pair, String(tfSeconds), bucket);
    return NextResponse.json({ ...signal, ...base, source: "illustrative" });
  }

  // 1m+ → real analysis of live candles, cached per window.
  const key = `${pair}:${tfSeconds}:${bucket}`;
  const hit = cache.get(key);
  if (hit) {
    return NextResponse.json({ ...hit.signal, ...base, source: "live", cached: true });
  }

  try {
    const candles = await fetchQuickCandles(pair, intervalForExpiry(tfSeconds), 60);
    // Drop the last (possibly still-forming) candle for a stable close series.
    const closes = candles.slice(0, -1).map((c) => c.close);
    const signal = analyzeQuickCandles(closes);
    if (!signal) throw new Error("insufficient candles");
    cache.set(key, { at: now, signal });
    pruneCache(now);
    return NextResponse.json({ ...signal, ...base, source: "live" });
  } catch {
    // Live feed / rate-limit failure → deterministic fallback (not cached, so
    // the next request can retry the live feed).
    const signal = deterministicQuickSignal(pair, String(tfSeconds), bucket);
    return NextResponse.json({ ...signal, ...base, source: "illustrative" });
  }
}

function pruneCache(now: number) {
  if (cache.size < 64) return;
  for (const [k, v] of cache) {
    if (now - v.at > 20 * 60_000) cache.delete(k);
  }
}
