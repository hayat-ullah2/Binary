import { NextResponse } from "next/server";
import { deterministicQuickSignal, QUICK_WINDOW_MS } from "@/lib/quick-signal";

export const dynamic = "force-dynamic";

/**
 * Returns the current Quick Signal for a pair + timeframe. It is a pure
 * deterministic function of (pair, tf, server-time-window), so EVERY device
 * that asks within the same window gets the IDENTICAL BUY/SELL + confidence —
 * no per-device randomness, no device-clock skew. Illustrative, not advice.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pair = (searchParams.get("pair") ?? "EURUSD").toUpperCase();
  const tf = searchParams.get("tf") ?? "30";

  const now = Date.now(); // server clock — shared across all callers
  const bucket = Math.floor(now / QUICK_WINDOW_MS);
  const signal = deterministicQuickSignal(pair, tf, bucket);
  const nextAt = (bucket + 1) * QUICK_WINDOW_MS;

  return NextResponse.json({
    ...signal,
    pair,
    tf,
    bucket,
    validForMs: nextAt - now, // ms until a new signal window begins
  });
}
