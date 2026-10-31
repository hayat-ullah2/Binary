import { ema, rsi, macd, atr } from "@/lib/indicators";
import type { Candle, CurrencyPair, Direction, Signal, Timeframe } from "@/types/forex";

/**
 * Rule-based signal engine (EMA crossover + RSI + MACD, ATR-based stops).
 *
 * Direction is decided by a majority vote of three indicators; a signal is only
 * emitted when at least 2 of 3 agree. Confidence (0–100) reflects how strongly
 * they agree — more aligned indicators and stronger readings → higher %.
 *
 * This is an illustrative strategy for the demo, not trading advice.
 */

const EMA_FAST = 9;
const EMA_SLOW = 21;
const RSI_PERIOD = 14;
const ATR_PERIOD = 14;
const ATR_STOP_MULT = 1.5; // stop distance = 1.5 × ATR
const REWARD_RATIO = 2; // target at 1:2 risk-reward

export interface GeneratedSignal extends Signal {
  reasons: string[];
}

function roundTo(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

export function generateSignalFromCandles(
  candles: Candle[],
  pair: CurrencyPair,
  timeframe: Timeframe,
  nowIso: string
): GeneratedSignal | null {
  if (candles.length < 40) return null;

  const close = candles.map((c) => c.close);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);
  const i = close.length - 1;

  const emaFast = ema(close, EMA_FAST);
  const emaSlow = ema(close, EMA_SLOW);
  const rsiArr = rsi(close, RSI_PERIOD);
  const { histogram } = macd(close);
  const atrArr = atr(high, low, close, ATR_PERIOD);

  const f = emaFast[i];
  const s = emaSlow[i];
  const r = rsiArr[i];
  const h = histogram[i];
  const a = atrArr[i];
  if ([f, s, r, h, a].some((v) => v == null || Number.isNaN(v))) return null;

  // ── Decision: EMA is the trend filter; RSI + MACD are confirmations ──
  // Direction always follows the EMA trend, so every reason stays coherent
  // with the call. A signal is only emitted when at least one of RSI / MACD
  // confirms that trend.
  const direction: Direction = f > s ? "BUY" : "SELL";
  const reasons: string[] = [
    direction === "BUY"
      ? "Fast EMA(9) above slow EMA(21) — uptrend"
      : "Fast EMA(9) below slow EMA(21) — downtrend",
  ];

  const rsiAgree = direction === "BUY" ? r >= 50 : r < 50;
  const macdAgree = direction === "BUY" ? h >= 0 : h < 0;

  if (rsiAgree) {
    reasons.push(`RSI ${r.toFixed(0)} — ${direction === "BUY" ? "bullish" : "bearish"} momentum`);
  } else {
    reasons.push(`RSI ${r.toFixed(0)} — momentum not yet confirming`);
  }

  if (macdAgree) {
    reasons.push(
      `MACD histogram ${h >= 0 ? "positive" : "negative"} — ${direction === "BUY" ? "upward" : "downward"} pressure`
    );
  } else {
    reasons.push(`MACD histogram ${h >= 0 ? "positive" : "negative"} — not confirming`);
  }

  const confirmations = (rsiAgree ? 1 : 0) + (macdAgree ? 1 : 0);
  if (confirmations < 1) return null; // trend alone isn't enough

  // Fresh EMA crossover within the last 3 candles adds conviction (coherent:
  // the fast line sits on the trend side now and was on the other side before).
  let fresh = false;
  for (let k = 1; k <= 3 && i - k >= 0; k++) {
    const pf = emaFast[i - k];
    const ps = emaSlow[i - k];
    if (Number.isNaN(pf) || Number.isNaN(ps)) continue;
    if (direction === "BUY" && pf <= ps) fresh = true;
    if (direction === "SELL" && pf >= ps) fresh = true;
  }
  if (fresh) {
    reasons.push(
      direction === "BUY" ? "Fresh bullish EMA crossover" : "Fresh bearish EMA crossover"
    );
  }

  // ── Confidence (ATR-relative so it's instrument-agnostic) ──
  let confidence = 52;
  confidence += Math.min(12, (Math.abs(f - s) / a) * 22); // trend strength
  if (rsiAgree) confidence += 8 + Math.min(6, (Math.abs(r - 50) / 50) * 12);
  if (macdAgree) confidence += 8 + Math.min(6, (Math.abs(h) / a) * 25);
  if (fresh) confidence += 8;

  // Caution: momentum stretched into overbought/oversold.
  if (direction === "BUY" && r > 75) {
    confidence -= 6;
    reasons.push("Caution: RSI overbought (>75)");
  }
  if (direction === "SELL" && r < 25) {
    confidence -= 6;
    reasons.push("Caution: RSI oversold (<25)");
  }

  confidence = Math.max(55, Math.min(94, Math.round(confidence)));

  // ── Levels ──
  const entry = close[i];
  const riskDist = ATR_STOP_MULT * a;
  const rewardDist = riskDist * REWARD_RATIO;

  const stopLoss =
    direction === "BUY" ? entry - riskDist : entry + riskDist;
  const takeProfit =
    direction === "BUY" ? entry + rewardDist : entry - rewardDist;

  const entryR = roundTo(entry, pair.decimals);
  const stopR = roundTo(stopLoss, pair.decimals);
  const tpR = roundTo(takeProfit, pair.decimals);

  const riskPips = roundTo(Math.abs(entryR - stopR) / pair.pipSize, 1);
  const rewardPips = roundTo(Math.abs(tpR - entryR) / pair.pipSize, 1);
  const riskReward = roundTo(rewardPips / riskPips, 2);

  return {
    id: `GEN-${pair.symbol}-${timeframe}`,
    pair: pair.symbol,
    direction,
    status: "ACTIVE",
    timeframe,
    entry: entryR,
    stopLoss: stopR,
    takeProfit: tpR,
    confidence,
    riskReward,
    riskPips,
    rewardPips,
    note: reasons.join(" · "),
    currentPrice: entryR,
    createdAt: nowIso,
    reasons,
  };
}
