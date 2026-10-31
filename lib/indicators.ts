/**
 * Pure technical-indicator math used by the signal engine.
 * Hand-rolled (no external dependency) so the engine is fully deterministic
 * and testable. All functions return an array aligned to the input length,
 * with `NaN` for the warm-up period where the indicator isn't defined yet.
 */

export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  // Seed with the SMA of the first `period` values.
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(values: number[], period = 14): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gain += change;
    else loss -= change;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const g = change > 0 ? change : 0;
    const l = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export interface MacdResult {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

export function macd(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdResult {
  const emaFast = ema(values, fastPeriod);
  const emaSlow = ema(values, slowPeriod);
  const macdLine = values.map((_, i) =>
    Number.isNaN(emaFast[i]) || Number.isNaN(emaSlow[i])
      ? NaN
      : emaFast[i] - emaSlow[i]
  );

  const signalLine = new Array<number>(values.length).fill(NaN);
  const firstIdx = macdLine.findIndex((v) => !Number.isNaN(v));
  if (firstIdx >= 0) {
    const defined = macdLine.slice(firstIdx);
    const sig = ema(defined, signalPeriod);
    for (let i = 0; i < sig.length; i++) signalLine[firstIdx + i] = sig[i];
  }

  const histogram = values.map((_, i) =>
    Number.isNaN(macdLine[i]) || Number.isNaN(signalLine[i])
      ? NaN
      : macdLine[i] - signalLine[i]
  );

  return { macdLine, signalLine, histogram };
}

/** Wilder's Average True Range. */
export function atr(
  high: number[],
  low: number[],
  close: number[],
  period = 14
): number[] {
  const n = close.length;
  const out = new Array<number>(n).fill(NaN);
  if (n <= period) return out;

  const tr = new Array<number>(n);
  tr[0] = high[0] - low[0];
  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );
  }

  let prev = 0;
  for (let i = 1; i <= period; i++) prev += tr[i];
  prev /= period;
  out[period] = prev;
  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

/** Last non-NaN value of a series (helper). */
export function last(series: number[]): number {
  for (let i = series.length - 1; i >= 0; i--) {
    if (!Number.isNaN(series[i])) return series[i];
  }
  return NaN;
}
