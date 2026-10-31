import { NextResponse } from "next/server";
import { fetchTimeSeries } from "@/lib/twelve-data";
import { generateCandles, getPair, TIMEFRAMES } from "@/lib/mock-data";
import { generateSignalFromCandles, type GeneratedSignal } from "@/lib/signal-engine";
import type { Candle, Timeframe } from "@/types/forex";

export const dynamic = "force-dynamic";

/**
 * Generates fresh signals using the rule-based engine (EMA + RSI + MACD) over
 * recent candles. Live candles come from Twelve Data; on rate-limit/error we
 * fall back to deterministic demo candles so a result is always produced.
 * Cached per timeframe for 3 minutes to respect the free-tier rate limit.
 */

const GEN_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "AUDUSD", "USDCHF"];
const TTL_MS = 180_000;

type Payload = {
  signals: GeneratedSignal[];
  source: "live" | "demo" | "mixed";
  timeframe: Timeframe;
  asOf: string;
  evaluated: number;
};

const cache = new Map<string, { at: number; payload: Payload }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tfParam = (searchParams.get("tf") ?? "H1") as Timeframe;
  const timeframe: Timeframe = TIMEFRAMES.includes(tfParam) ? tfParam : "H1";
  const now = Date.now();

  const hit = cache.get(timeframe);
  if (hit && now - hit.at < TTL_MS) {
    return NextResponse.json({ ...hit.payload, cached: true });
  }

  const nowIso = new Date(now).toISOString();
  const signals: GeneratedSignal[] = [];
  let liveCount = 0;
  let demoCount = 0;

  for (const symbol of GEN_SYMBOLS) {
    const pair = getPair(symbol);
    let candles: Candle[];
    let isLive: boolean;
    try {
      candles = await fetchTimeSeries(symbol, timeframe, 120);
      if (candles.length < 40) throw new Error("insufficient live candles");
      isLive = true;
    } catch {
      candles = generateCandles(symbol, timeframe, 120);
      isLive = false;
    }

    const signal = generateSignalFromCandles(candles, pair, timeframe, nowIso);
    if (signal) {
      signals.push(signal);
      if (isLive) liveCount++;
      else demoCount++;
    }
  }

  // Strongest setups first.
  signals.sort((a, b) => b.confidence - a.confidence);

  const source: Payload["source"] =
    demoCount === 0 ? "live" : liveCount === 0 ? "demo" : "mixed";

  const payload: Payload = {
    signals,
    source,
    timeframe,
    asOf: nowIso,
    evaluated: GEN_SYMBOLS.length,
  };
  cache.set(timeframe, { at: now, payload });
  return NextResponse.json(payload);
}
