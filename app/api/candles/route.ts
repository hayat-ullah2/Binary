import { NextResponse } from "next/server";
import { fetchTimeSeries } from "@/lib/twelve-data";
import { generateCandles, getPair, TIMEFRAMES } from "@/lib/mock-data";
import type { Candle, Timeframe } from "@/types/forex";

export const dynamic = "force-dynamic";

/**
 * OHLC candles for one symbol/timeframe. Cached in-process (2 min) per
 * symbol+timeframe to stay within the free-tier rate limit. Falls back to
 * deterministic demo candles on any error.
 */

const TTL_MS = 120_000;

type Payload = {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  source: "live" | "demo";
  asOf: string;
};

const cache = new Map<string, { at: number; payload: Payload }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "EURUSD").toUpperCase();
  const tfParam = (searchParams.get("tf") ?? "H1") as Timeframe;
  const timeframe: Timeframe = TIMEFRAMES.includes(tfParam) ? tfParam : "H1";

  // Validate symbol against known pairs.
  const pair = getPair(symbol);
  const key = `${pair.symbol}:${timeframe}`;
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) {
    return NextResponse.json({ ...hit.payload, cached: true });
  }

  try {
    const candles = await fetchTimeSeries(pair.symbol, timeframe, 60);
    if (candles.length === 0) throw new Error("empty candle response");
    const payload: Payload = {
      symbol: pair.symbol,
      timeframe,
      candles,
      source: "live",
      asOf: new Date(now).toISOString(),
    };
    cache.set(key, { at: now, payload });
    return NextResponse.json(payload);
  } catch {
    const payload: Payload = {
      symbol: pair.symbol,
      timeframe,
      candles: generateCandles(pair.symbol, timeframe, 56),
      source: "demo",
      asOf: new Date(now).toISOString(),
    };
    cache.set(key, { at: now - (TTL_MS - 15_000), payload });
    return NextResponse.json(payload);
  }
}
