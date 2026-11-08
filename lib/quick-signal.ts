import type { Direction } from "@/types/forex";
import { ema, rsi, macd, last } from "@/lib/indicators";

/**
 * Quotex-style short-expiry ("turbo") signal helper.
 *
 * These are ILLUSTRATIVE signals for a UI demo. The direction is produced from
 * a light momentum bias (sign/size of the pair's recent change) blended with a
 * random draw — binary-option style. This is NOT trading advice.
 */

export interface QuickTimeframe {
  seconds: number;
  label: string;
}

export const QUICK_TIMEFRAMES: QuickTimeframe[] = [
  { seconds: 5, label: "5s" },
  { seconds: 10, label: "10s" },
  { seconds: 20, label: "20s" },
  { seconds: 30, label: "30s" },
  { seconds: 40, label: "40s" },
  { seconds: 50, label: "50s" },
  { seconds: 60, label: "1m" },
  { seconds: 120, label: "2m" },
  { seconds: 180, label: "3m" },
  { seconds: 300, label: "5m" },
  { seconds: 900, label: "15m" },
];

/** Pairs offered on the quick-signal board (majors + gold). */
export const QUICK_PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "XAUUSD",
  "AUDUSD",
  "USDCHF",
  "EURJPY",
  "GBPJPY",
];

export interface QuickSignal {
  direction: Direction;
  /** Illustrative confidence 60–96. */
  confidence: number;
}

/**
 * Generate a BUY/SELL call. `biasPercent` is the pair's recent % change — a
 * positive value nudges toward BUY, negative toward SELL — combined with a
 * random component so it behaves like a live turbo signal.
 * Call this from an event handler (uses Math.random), never during render.
 */
export function generateQuickSignal(biasPercent = 0): QuickSignal {
  const lean = Math.max(-0.35, Math.min(0.35, biasPercent / 5));
  const direction: Direction = Math.random() < 0.5 + lean ? "BUY" : "SELL";
  const confidence = Math.round(60 + Math.random() * 36);
  return { direction, confidence };
}

/**
 * How long one Quick Signal stays valid, aligned to the clock. Tied to the
 * timeframe (minimum 60s) so the signal is stable for the whole candle/minute —
 * every device within the same window sees the same call, and boundary flips
 * are rare (they only happen exactly on a minute/candle edge).
 */
export function quickWindowMs(tfSeconds: number): number {
  return Math.max(60_000, Math.round(tfSeconds) * 1000);
}

/** Stable FNV-1a hash → unsigned 32-bit int. */
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * DETERMINISTIC signal: a pure function of pair + timeframe + time-window
 * (bucket). No Math.random, no device clock — so the same inputs produce the
 * SAME BUY/SELL + confidence on every device and every server instance.
 * Still illustrative, not trading advice.
 */
export function deterministicQuickSignal(
  pair: string,
  tf: string | number,
  bucket: number
): QuickSignal {
  const seed = hashString(`${pair}:${tf}:${bucket}`);
  const direction: Direction = seed % 2 === 0 ? "BUY" : "SELL";
  const confidence = 60 + (seed % 37); // 60–96, deterministic
  return { direction, confidence };
}

/** Quick-expiry seconds → a Twelve Data candle interval for live analysis. */
export function intervalForExpiry(tfSeconds: number): string {
  if (tfSeconds >= 900) return "15min";
  if (tfSeconds >= 300) return "5min";
  return "1min"; // 1m, 2m, 3m
}

/**
 * REAL analysis of live candles (EMA 9/21 trend + RSI & MACD confirmations).
 * Always returns a BUY/SELL (no "no-trade"): direction follows the EMA trend,
 * confidence rises with each confirming indicator + trend strength. It is a
 * pure function of the (closed) candle closes, so every device analysing the
 * same candles gets the same call. Still illustrative, not advice.
 */
export function analyzeQuickCandles(closes: number[]): QuickSignal | null {
  if (closes.length < 25) return null; // not enough data to analyse

  const f = last(ema(closes, 9));
  const s = last(ema(closes, 21));
  const r = last(rsi(closes, 14));
  const h = last(macd(closes).histogram);
  if ([f, s, r, h].some((v) => !Number.isFinite(v))) return null;

  const direction: Direction = f >= s ? "BUY" : "SELL";
  const rsiAgree = direction === "BUY" ? r >= 50 : r < 50;
  const macdAgree = direction === "BUY" ? h >= 0 : h < 0;

  // Trend strength = EMA separation relative to price (capped).
  const sep = s !== 0 ? Math.abs(f - s) / Math.abs(s) : 0;
  const trend = Math.min(14, sep * 4000); // ~0–14

  let confidence = 60 + trend;
  if (rsiAgree) confidence += 8;
  if (macdAgree) confidence += 8;
  confidence = Math.round(Math.max(60, Math.min(96, confidence)));

  return { direction, confidence };
}
