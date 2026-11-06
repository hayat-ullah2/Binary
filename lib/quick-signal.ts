import type { Direction } from "@/types/forex";

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
 * How long one Quick Signal stays valid. The signal is fixed per
 * pair + timeframe within each window, so EVERY device sees the same call.
 */
export const QUICK_WINDOW_MS = 30_000; // 30 seconds

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
