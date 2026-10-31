import type {
  ActivityItem,
  AnalyticsSummary,
  Candle,
  CurrencyPair,
  DirectionPerformance,
  HistorySignal,
  MarketSession,
  PairPerformance,
  PerformancePoint,
  Quote,
  Signal,
  Timeframe,
  TimeframePerformance,
} from "@/types/forex";

/*
  ────────────────────────────────────────────────────────────────────────
  DEMONSTRATION DATA ONLY
  Every price, signal, and statistic in this file is fabricated for UI
  presentation. Nothing here is a live market feed or verified performance.
  A fixed reference "now" keeps relative times deterministic across renders.
  ────────────────────────────────────────────────────────────────────────
*/

/** Fixed reference timestamp so "x ago" labels are stable (no hydration drift). */
export const MARKET_NOW = "2026-10-27T13:20:00Z";

/** Tiny deterministic PRNG (mulberry32) so charts render identically everywhere. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── Currency pairs ────────────────────────────────────────────────────────

export const CURRENCY_PAIRS: CurrencyPair[] = [
  { symbol: "EURUSD", label: "EUR/USD", base: "EUR", quote: "USD", category: "Major", decimals: 5, pipSize: 0.0001 },
  { symbol: "GBPUSD", label: "GBP/USD", base: "GBP", quote: "USD", category: "Major", decimals: 5, pipSize: 0.0001 },
  { symbol: "USDJPY", label: "USD/JPY", base: "USD", quote: "JPY", category: "Major", decimals: 3, pipSize: 0.01 },
  { symbol: "XAUUSD", label: "XAU/USD", base: "XAU", quote: "USD", category: "Metal", decimals: 2, pipSize: 0.1 },
  { symbol: "AUDUSD", label: "AUD/USD", base: "AUD", quote: "USD", category: "Major", decimals: 5, pipSize: 0.0001 },
  { symbol: "USDCHF", label: "USD/CHF", base: "USD", quote: "CHF", category: "Major", decimals: 5, pipSize: 0.0001 },
  { symbol: "USDCAD", label: "USD/CAD", base: "USD", quote: "CAD", category: "Major", decimals: 5, pipSize: 0.0001 },
  { symbol: "NZDUSD", label: "NZD/USD", base: "NZD", quote: "USD", category: "Major", decimals: 5, pipSize: 0.0001 },
  { symbol: "EURGBP", label: "EUR/GBP", base: "EUR", quote: "GBP", category: "Minor", decimals: 5, pipSize: 0.0001 },
  { symbol: "EURJPY", label: "EUR/JPY", base: "EUR", quote: "JPY", category: "Minor", decimals: 3, pipSize: 0.01 },
  { symbol: "GBPJPY", label: "GBP/JPY", base: "GBP", quote: "JPY", category: "Minor", decimals: 3, pipSize: 0.01 },
];

export const PAIR_MAP: Record<string, CurrencyPair> = Object.fromEntries(
  CURRENCY_PAIRS.map((p) => [p.symbol, p])
);

export function getPair(symbol: string): CurrencyPair {
  return PAIR_MAP[symbol] ?? CURRENCY_PAIRS[0];
}

// ── Reference prices (illustrative) ─────────────────────────────────────────

const BASE_PRICE: Record<string, number> = {
  EURUSD: 1.0854,
  GBPUSD: 1.2683,
  USDJPY: 152.41,
  XAUUSD: 2648.4,
  AUDUSD: 0.6621,
  USDCHF: 0.8842,
  USDCAD: 1.3718,
  NZDUSD: 0.6012,
  EURGBP: 0.8558,
  EURJPY: 165.43,
  GBPJPY: 193.27,
};

// ── Quotes & sparklines ─────────────────────────────────────────────────────

function buildSparkline(symbol: string, points = 24): number[] {
  const rng = seeded(hashString(symbol + "spark"));
  const base = BASE_PRICE[symbol];
  const vol = base * 0.0016; // absolute step size in price terms
  let price = base - vol * 3;
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    price += (rng() - 0.46) * vol;
    out.push(Number(price.toFixed(getPair(symbol).decimals)));
  }
  return out;
}

export const QUOTES: Quote[] = CURRENCY_PAIRS.map((p) => {
  const rng = seeded(hashString(p.symbol + "quote"));
  const base = BASE_PRICE[p.symbol];
  const spark = buildSparkline(p.symbol);
  const changePct = (rng() - 0.45) * 1.4;
  const dayChange = Number(((base * changePct) / 100).toFixed(p.decimals));
  const spreadPips = p.category === "Metal" ? 18 : p.quote === "JPY" ? 1.4 : 0.6;
  const mid = spark[spark.length - 1];
  const half = (spreadPips * p.pipSize) / 2;
  const range = base * 0.004;
  return {
    symbol: p.symbol,
    bid: Number((mid - half).toFixed(p.decimals)),
    ask: Number((mid + half).toFixed(p.decimals)),
    spread: Number(spreadPips.toFixed(1)),
    dayChange,
    dayChangePercent: Number(changePct.toFixed(2)),
    dayHigh: Number((base + range * rng()).toFixed(p.decimals)),
    dayLow: Number((base - range * rng()).toFixed(p.decimals)),
    sparkline: spark,
  };
});

export const QUOTE_MAP: Record<string, Quote> = Object.fromEntries(
  QUOTES.map((q) => [q.symbol, q])
);

// ── Candle series for price charts ──────────────────────────────────────────

const TF_MINUTES: Record<Timeframe, number> = {
  M15: 15,
  M30: 30,
  H1: 60,
  H4: 240,
  D1: 1440,
};

export function generateCandles(
  symbol: string,
  timeframe: Timeframe,
  count = 60
): Candle[] {
  const pair = getPair(symbol);
  const rng = seeded(hashString(symbol + timeframe));
  const base = BASE_PRICE[symbol];
  const vol = base * (pair.category === "Metal" ? 0.004 : 0.0022); // absolute step
  const step = TF_MINUTES[timeframe] * 60_000;
  const start = new Date(MARKET_NOW).getTime() - step * count;
  let close = base - vol * 2;
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const open = close;
    const drift = (rng() - 0.48) * vol;
    close = open + drift;
    const high = Math.max(open, close) + rng() * vol * 0.6;
    const low = Math.min(open, close) - rng() * vol * 0.6;
    candles.push({
      time: new Date(start + i * step).toISOString(),
      open: Number(open.toFixed(pair.decimals)),
      high: Number(high.toFixed(pair.decimals)),
      low: Number(low.toFixed(pair.decimals)),
      close: Number(close.toFixed(pair.decimals)),
    });
  }
  return candles;
}

// ── Active / recent signals ─────────────────────────────────────────────────

function minutesAgo(mins: number): string {
  return new Date(new Date(MARKET_NOW).getTime() - mins * 60_000).toISOString();
}
function hoursAgo(h: number): string {
  return minutesAgo(h * 60);
}
function daysAgo(d: number): string {
  return minutesAgo(d * 60 * 24);
}

interface SignalSeed {
  pair: string;
  direction: "BUY" | "SELL";
  status: Signal["status"];
  timeframe: Timeframe;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  createdAt: string;
  note: string;
  currentPrice?: number;
}

const SIGNAL_SEEDS: SignalSeed[] = [
  { pair: "EURUSD", direction: "BUY", status: "ACTIVE", timeframe: "H1", entry: 1.0842, stopLoss: 1.0812, takeProfit: 1.0912, confidence: 82, createdAt: minutesAgo(38), note: "Bullish rejection at the H1 demand zone with rising momentum.", currentPrice: 1.0861 },
  { pair: "XAUUSD", direction: "BUY", status: "ACTIVE", timeframe: "H4", entry: 2641.5, stopLoss: 2628.0, takeProfit: 2674.0, confidence: 76, createdAt: hoursAgo(2), note: "Gold holding above the 50-EMA; continuation toward prior highs.", currentPrice: 2648.4 },
  { pair: "GBPUSD", direction: "SELL", status: "ACTIVE", timeframe: "M30", entry: 1.2701, stopLoss: 1.2729, takeProfit: 1.2641, confidence: 68, createdAt: minutesAgo(54), note: "Lower-high structure into London fix; targeting intraday liquidity.", currentPrice: 1.2688 },
  { pair: "USDJPY", direction: "BUY", status: "ACTIVE", timeframe: "H1", entry: 152.10, stopLoss: 151.62, takeProfit: 153.05, confidence: 71, createdAt: hoursAgo(1), note: "Breakout retest above the session range with yield support.", currentPrice: 152.41 },
  { pair: "AUDUSD", direction: "SELL", status: "PENDING", timeframe: "H4", entry: 0.6650, stopLoss: 0.6682, takeProfit: 0.6585, confidence: 64, createdAt: minutesAgo(22), note: "Awaiting pullback into supply before confirmation." },
  { pair: "EURJPY", direction: "BUY", status: "TARGET_HIT", timeframe: "H1", entry: 164.80, stopLoss: 164.35, takeProfit: 165.60, confidence: 79, createdAt: hoursAgo(6), note: "Target reached on the London–NY overlap expansion." },
  { pair: "USDCAD", direction: "SELL", status: "STOP_HIT", timeframe: "M30", entry: 1.3702, stopLoss: 1.3734, takeProfit: 1.3640, confidence: 61, createdAt: hoursAgo(8), note: "Stopped out as crude weakness reversed the setup." },
  { pair: "GBPJPY", direction: "BUY", status: "ACTIVE", timeframe: "H4", entry: 192.40, stopLoss: 191.60, takeProfit: 194.20, confidence: 74, createdAt: hoursAgo(3), note: "Trend continuation above the ascending trendline.", currentPrice: 193.27 },
  { pair: "NZDUSD", direction: "SELL", status: "EXPIRED", timeframe: "H1", entry: 0.6035, stopLoss: 0.6062, takeProfit: 0.5980, confidence: 58, createdAt: hoursAgo(11), note: "Setup invalidated by time; price never triggered entry." },
  { pair: "USDCHF", direction: "BUY", status: "ACTIVE", timeframe: "H1", entry: 0.8828, stopLoss: 0.8801, takeProfit: 0.8882, confidence: 70, createdAt: minutesAgo(90), note: "Double-bottom on H1 with momentum divergence.", currentPrice: 0.8842 },
  { pair: "EURGBP", direction: "SELL", status: "TARGET_HIT", timeframe: "M30", entry: 0.8575, stopLoss: 0.8593, takeProfit: 0.8540, confidence: 66, createdAt: hoursAgo(5), note: "Range-fade from the upper boundary played out cleanly." },
  { pair: "EURUSD", direction: "SELL", status: "EXPIRED", timeframe: "M15", entry: 1.0869, stopLoss: 1.0888, takeProfit: 1.0831, confidence: 55, createdAt: hoursAgo(9), note: "Scalp window closed before entry conditions aligned." },
];

function buildSignal(seed: SignalSeed, idx: number): Signal {
  const pair = getPair(seed.pair);
  const riskPips = Number((Math.abs(seed.entry - seed.stopLoss) / pair.pipSize).toFixed(1));
  const rewardPips = Number((Math.abs(seed.takeProfit - seed.entry) / pair.pipSize).toFixed(1));
  const riskReward = Number((rewardPips / riskPips).toFixed(2));
  return {
    id: `SIG-${String(idx + 1).padStart(4, "0")}`,
    pair: seed.pair,
    direction: seed.direction,
    status: seed.status,
    timeframe: seed.timeframe,
    entry: seed.entry,
    stopLoss: seed.stopLoss,
    takeProfit: seed.takeProfit,
    confidence: seed.confidence,
    riskReward,
    riskPips,
    rewardPips,
    createdAt: seed.createdAt,
    note: seed.note,
    currentPrice: seed.currentPrice,
  };
}

export const SIGNALS: Signal[] = SIGNAL_SEEDS.map(buildSignal);

export const ACTIVE_SIGNALS = SIGNALS.filter(
  (s) => s.status === "ACTIVE" || s.status === "PENDING"
);

// ── Historical signals ──────────────────────────────────────────────────────

interface HistorySeed {
  pair: string;
  direction: "BUY" | "SELL";
  timeframe: Timeframe;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  outcome: HistorySignal["outcome"];
  confidence: number;
  daysBack: number;
}

const HISTORY_SEEDS: HistorySeed[] = [
  { pair: "EURUSD", direction: "BUY", timeframe: "H1", entry: 1.0792, stopLoss: 1.0764, takeProfit: 1.0856, outcome: "WIN", confidence: 80, daysBack: 1 },
  { pair: "XAUUSD", direction: "BUY", timeframe: "H4", entry: 2602.0, stopLoss: 2588.0, takeProfit: 2636.0, outcome: "WIN", confidence: 78, daysBack: 1 },
  { pair: "GBPUSD", direction: "SELL", timeframe: "M30", entry: 1.2744, stopLoss: 1.2772, takeProfit: 1.2686, outcome: "LOSS", confidence: 63, daysBack: 2 },
  { pair: "USDJPY", direction: "BUY", timeframe: "H1", entry: 151.20, stopLoss: 150.80, takeProfit: 152.00, outcome: "WIN", confidence: 74, daysBack: 2 },
  { pair: "AUDUSD", direction: "SELL", timeframe: "H4", entry: 0.6702, stopLoss: 0.6732, takeProfit: 0.6640, outcome: "WIN", confidence: 69, daysBack: 3 },
  { pair: "GBPJPY", direction: "BUY", timeframe: "H4", entry: 190.80, stopLoss: 190.00, takeProfit: 192.60, outcome: "WIN", confidence: 77, daysBack: 3 },
  { pair: "USDCAD", direction: "SELL", timeframe: "M30", entry: 1.3760, stopLoss: 1.3792, takeProfit: 1.3700, outcome: "LOSS", confidence: 60, daysBack: 4 },
  { pair: "EURJPY", direction: "BUY", timeframe: "H1", entry: 163.40, stopLoss: 162.95, takeProfit: 164.25, outcome: "WIN", confidence: 72, daysBack: 4 },
  { pair: "NZDUSD", direction: "SELL", timeframe: "H1", entry: 0.6078, stopLoss: 0.6104, takeProfit: 0.6024, outcome: "WIN", confidence: 66, daysBack: 5 },
  { pair: "USDCHF", direction: "BUY", timeframe: "H1", entry: 0.8796, stopLoss: 0.8769, takeProfit: 0.8850, outcome: "LOSS", confidence: 58, daysBack: 5 },
  { pair: "EURUSD", direction: "SELL", timeframe: "M30", entry: 1.0901, stopLoss: 1.0925, takeProfit: 1.0849, outcome: "WIN", confidence: 71, daysBack: 6 },
  { pair: "XAUUSD", direction: "SELL", timeframe: "H1", entry: 2668.0, stopLoss: 2680.0, takeProfit: 2640.0, outcome: "WIN", confidence: 73, daysBack: 6 },
  { pair: "GBPUSD", direction: "BUY", timeframe: "H4", entry: 1.2620, stopLoss: 1.2586, takeProfit: 1.2690, outcome: "WIN", confidence: 75, daysBack: 7 },
  { pair: "USDJPY", direction: "SELL", timeframe: "H1", entry: 153.10, stopLoss: 153.48, takeProfit: 152.40, outcome: "LOSS", confidence: 62, daysBack: 8 },
  { pair: "EURGBP", direction: "BUY", timeframe: "M30", entry: 0.8520, stopLoss: 0.8502, takeProfit: 0.8556, outcome: "WIN", confidence: 67, daysBack: 9 },
  { pair: "GBPJPY", direction: "SELL", timeframe: "H4", entry: 194.80, stopLoss: 195.60, takeProfit: 193.00, outcome: "BREAKEVEN", confidence: 64, daysBack: 10 },
  { pair: "AUDUSD", direction: "BUY", timeframe: "H1", entry: 0.6588, stopLoss: 0.6562, takeProfit: 0.6640, outcome: "WIN", confidence: 70, daysBack: 11 },
  { pair: "XAUUSD", direction: "BUY", timeframe: "H4", entry: 2572.0, stopLoss: 2556.0, takeProfit: 2610.0, outcome: "WIN", confidence: 81, daysBack: 12 },
  { pair: "EURUSD", direction: "BUY", timeframe: "H1", entry: 1.0748, stopLoss: 1.0722, takeProfit: 1.0802, outcome: "LOSS", confidence: 59, daysBack: 13 },
  { pair: "USDCAD", direction: "BUY", timeframe: "H4", entry: 1.3648, stopLoss: 1.3616, takeProfit: 1.3712, outcome: "WIN", confidence: 72, daysBack: 14 },
  { pair: "USDJPY", direction: "BUY", timeframe: "H4", entry: 150.40, stopLoss: 149.90, takeProfit: 151.40, outcome: "WIN", confidence: 76, daysBack: 16 },
  { pair: "GBPUSD", direction: "SELL", timeframe: "H1", entry: 1.2810, stopLoss: 1.2840, takeProfit: 1.2750, outcome: "WIN", confidence: 68, daysBack: 18 },
  { pair: "EURJPY", direction: "SELL", timeframe: "M30", entry: 166.20, stopLoss: 166.58, takeProfit: 165.50, outcome: "LOSS", confidence: 57, daysBack: 20 },
  { pair: "XAUUSD", direction: "BUY", timeframe: "H1", entry: 2540.0, stopLoss: 2526.0, takeProfit: 2572.0, outcome: "WIN", confidence: 79, daysBack: 22 },
  { pair: "NZDUSD", direction: "BUY", timeframe: "H4", entry: 0.5962, stopLoss: 0.5938, takeProfit: 0.6012, outcome: "WIN", confidence: 65, daysBack: 24 },
  { pair: "EURGBP", direction: "SELL", timeframe: "H1", entry: 0.8604, stopLoss: 0.8624, takeProfit: 0.8560, outcome: "WIN", confidence: 69, daysBack: 26 },
  { pair: "GBPJPY", direction: "BUY", timeframe: "H1", entry: 189.20, stopLoss: 188.50, takeProfit: 190.80, outcome: "LOSS", confidence: 60, daysBack: 28 },
  { pair: "USDCHF", direction: "SELL", timeframe: "M30", entry: 0.8878, stopLoss: 0.8902, takeProfit: 0.8826, outcome: "WIN", confidence: 71, daysBack: 30 },
];

function buildHistory(seed: HistorySeed, idx: number): HistorySignal {
  const pair = getPair(seed.pair);
  const riskPips = Number((Math.abs(seed.entry - seed.stopLoss) / pair.pipSize).toFixed(1));
  const rewardPips = Number((Math.abs(seed.takeProfit - seed.entry) / pair.pipSize).toFixed(1));
  const riskReward = Number((rewardPips / riskPips).toFixed(2));

  let exit: number;
  let pips: number;
  if (seed.outcome === "WIN") {
    exit = seed.takeProfit;
    pips = rewardPips;
  } else if (seed.outcome === "LOSS") {
    exit = seed.stopLoss;
    pips = -riskPips;
  } else {
    exit = seed.entry;
    pips = 0;
  }

  const createdAt = daysAgo(seed.daysBack);
  const closedAt = new Date(
    new Date(createdAt).getTime() + (3 + (idx % 6)) * 3600_000
  ).toISOString();

  return {
    id: `H-${String(idx + 1).padStart(4, "0")}`,
    pair: seed.pair,
    direction: seed.direction,
    status: seed.outcome === "WIN" ? "TARGET_HIT" : seed.outcome === "LOSS" ? "STOP_HIT" : "EXPIRED",
    timeframe: seed.timeframe,
    entry: seed.entry,
    stopLoss: seed.stopLoss,
    takeProfit: seed.takeProfit,
    confidence: seed.confidence,
    riskReward,
    riskPips,
    rewardPips,
    createdAt,
    note: "",
    outcome: seed.outcome,
    exit,
    pips: Number(pips.toFixed(1)),
    closedAt,
  };
}

export const HISTORY: HistorySignal[] = HISTORY_SEEDS.map(buildHistory);

// ── Analytics (derived from history for internal consistency) ────────────────

function derivePairPerformance(): PairPerformance[] {
  const map = new Map<string, PairPerformance>();
  for (const h of HISTORY) {
    const cur =
      map.get(h.pair) ??
      { pair: h.pair, signals: 0, wins: 0, losses: 0, winRate: 0, pips: 0 };
    cur.signals += 1;
    if (h.outcome === "WIN") cur.wins += 1;
    if (h.outcome === "LOSS") cur.losses += 1;
    cur.pips += h.pips;
    map.set(h.pair, cur);
  }
  return [...map.values()]
    .map((p) => ({
      ...p,
      pips: Number(p.pips.toFixed(1)),
      winRate: p.signals ? Math.round((p.wins / p.signals) * 100) : 0,
    }))
    .sort((a, b) => b.pips - a.pips);
}

export const PAIR_PERFORMANCE: PairPerformance[] = derivePairPerformance();

export const TIMEFRAME_PERFORMANCE: TimeframePerformance[] = (() => {
  const tfs: Timeframe[] = ["M15", "M30", "H1", "H4", "D1"];
  return tfs
    .map((tf) => {
      const rows = HISTORY.filter((h) => h.timeframe === tf);
      const wins = rows.filter((r) => r.outcome === "WIN").length;
      const pips = rows.reduce((s, r) => s + r.pips, 0);
      const avgRR = rows.length
        ? rows.reduce((s, r) => s + r.riskReward, 0) / rows.length
        : 0;
      return {
        timeframe: tf,
        signals: rows.length,
        winRate: rows.length ? Math.round((wins / rows.length) * 100) : 0,
        pips: Number(pips.toFixed(1)),
        avgRiskReward: Number(avgRR.toFixed(2)),
      };
    })
    .filter((r) => r.signals > 0);
})();

export const DIRECTION_PERFORMANCE: DirectionPerformance[] = (() => {
  return (["BUY", "SELL"] as const).map((dir) => {
    const rows = HISTORY.filter((h) => h.direction === dir);
    const wins = rows.filter((r) => r.outcome === "WIN").length;
    const pips = rows.reduce((s, r) => s + r.pips, 0);
    return {
      direction: dir,
      signals: rows.length,
      wins,
      winRate: rows.length ? Math.round((wins / rows.length) * 100) : 0,
      pips: Number(pips.toFixed(1)),
    };
  });
})();

/** Daily performance for the last 14 days (illustrative, seeded). */
export const DAILY_PERFORMANCE: PerformancePoint[] = (() => {
  const rng = seeded(1337);
  const days = 14;
  let cumulative = 0;
  const out: PerformancePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(new Date(MARKET_NOW).getTime() - i * 86_400_000);
    const wins = Math.floor(rng() * 4) + 1;
    const losses = Math.floor(rng() * 3);
    const pips = Number((wins * (18 + rng() * 26) - losses * (14 + rng() * 18)).toFixed(1));
    cumulative = Number((cumulative + pips).toFixed(1));
    out.push({
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      wins,
      losses,
      pips,
      cumulativePips: cumulative,
    });
  }
  return out;
})();

/** Weekly performance for the last 8 weeks (illustrative, seeded). */
export const WEEKLY_PERFORMANCE: PerformancePoint[] = (() => {
  const rng = seeded(90210);
  let cumulative = 0;
  const out: PerformancePoint[] = [];
  for (let i = 8; i >= 1; i--) {
    const wins = Math.floor(rng() * 10) + 6;
    const losses = Math.floor(rng() * 6) + 2;
    const pips = Number((wins * (20 + rng() * 22) - losses * (16 + rng() * 16)).toFixed(1));
    cumulative = Number((cumulative + pips).toFixed(1));
    out.push({ label: `Wk ${9 - i}`, wins, losses, pips, cumulativePips: cumulative });
  }
  return out;
})();

export const ANALYTICS_SUMMARY: AnalyticsSummary = (() => {
  const total = HISTORY.length;
  const wins = HISTORY.filter((h) => h.outcome === "WIN").length;
  const netPips = Number(HISTORY.reduce((s, h) => s + h.pips, 0).toFixed(1));
  const avgRR = Number(
    (HISTORY.reduce((s, h) => s + h.riskReward, 0) / total).toFixed(2)
  );
  const grossWin = HISTORY.filter((h) => h.pips > 0).reduce((s, h) => s + h.pips, 0);
  const grossLoss = Math.abs(
    HISTORY.filter((h) => h.pips < 0).reduce((s, h) => s + h.pips, 0)
  );
  const best = [...PAIR_PERFORMANCE].sort((a, b) => b.pips - a.pips)[0];
  const avgConfidence = Math.round(
    HISTORY.reduce((s, h) => s + h.confidence, 0) / total
  );
  return {
    totalSignals: total,
    winRate: Math.round((wins / total) * 100),
    netPips,
    avgRiskReward: avgRR,
    bestPair: best.pair,
    activeSignals: ACTIVE_SIGNALS.length,
    avgConfidence,
    profitFactor: Number((grossWin / grossLoss).toFixed(2)),
  };
})();

// ── Market sessions ─────────────────────────────────────────────────────────

export const MARKET_SESSIONS: MarketSession[] = [
  { name: "Sydney", city: "Sydney", openUtc: 21, closeUtc: 6 },
  { name: "Tokyo", city: "Tokyo", openUtc: 0, closeUtc: 9 },
  { name: "London", city: "London", openUtc: 7, closeUtc: 16 },
  { name: "New York", city: "New York", openUtc: 12, closeUtc: 21 },
];

export function sessionIsOpen(session: MarketSession, utcHour: number): boolean {
  if (session.openUtc < session.closeUtc) {
    return utcHour >= session.openUtc && utcHour < session.closeUtc;
  }
  // wraps midnight
  return utcHour >= session.openUtc || utcHour < session.closeUtc;
}

// ── Activity feed ───────────────────────────────────────────────────────────

export const ACTIVITY: ActivityItem[] = [
  { id: "a1", type: "signal", title: "New signal · EUR/USD", detail: "BUY setup issued on H1 at 1.0842", time: minutesAgo(38) },
  { id: "a2", type: "target", title: "Target hit · EUR/JPY", detail: "Closed +80 pips on H1", time: hoursAgo(1) },
  { id: "a3", type: "signal", title: "New signal · USD/JPY", detail: "BUY breakout retest on H1", time: hoursAgo(1) },
  { id: "a4", type: "watchlist", title: "Watchlist update", detail: "XAU/USD added to your watchlist", time: hoursAgo(2) },
  { id: "a5", type: "stop", title: "Stop hit · USD/CAD", detail: "Closed −32 pips on M30", time: hoursAgo(8) },
  { id: "a6", type: "system", title: "Session open · London", detail: "London session is now active", time: hoursAgo(6) },
];

export const NOTIFICATIONS: ActivityItem[] = ACTIVITY.slice(0, 5);

// ── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_WATCHLIST = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "XAUUSD",
  "AUDUSD",
  "GBPJPY",
];

export const TIMEFRAMES: Timeframe[] = ["M15", "M30", "H1", "H4", "D1"];
