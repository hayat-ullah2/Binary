/**
 * Domain types for the PipPilot Forex Signals prototype.
 * All data backed by these types is demonstration data — see lib/mock-data.ts.
 */

export type Direction = "BUY" | "SELL";

export type Timeframe = "M15" | "M30" | "H1" | "H4" | "D1";

export type SignalStatus =
  | "ACTIVE"
  | "TARGET_HIT"
  | "STOP_HIT"
  | "EXPIRED"
  | "PENDING";

export type SignalOutcome = "WIN" | "LOSS" | "BREAKEVEN";

export type MarketSessionName = "Sydney" | "Tokyo" | "London" | "New York";

export type CurrencyPairCategory = "Major" | "Minor" | "Metal";

export interface CurrencyPair {
  /** Symbol without separator, e.g. "EURUSD". */
  symbol: string;
  /** Display label, e.g. "EUR/USD". */
  label: string;
  base: string;
  quote: string;
  category: CurrencyPairCategory;
  /** Decimal places used to display the price. */
  decimals: number;
  /** Value of one pip in price terms (e.g. 0.0001, or 0.01 for JPY pairs). */
  pipSize: number;
}

export interface Candle {
  /** ISO timestamp for the candle open. */
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PricePoint {
  time: string;
  price: number;
}

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  /** Spread in pips. */
  spread: number;
  /** Change over the session in price terms. */
  dayChange: number;
  /** Change over the session as a percentage. */
  dayChangePercent: number;
  dayHigh: number;
  dayLow: number;
  /** Small series for a sparkline. */
  sparkline: number[];
}

export interface Signal {
  id: string;
  pair: string; // CurrencyPair.symbol
  direction: Direction;
  status: SignalStatus;
  timeframe: Timeframe;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  /** Model confidence 0–100 (illustrative). */
  confidence: number;
  /** Reward-to-risk ratio, e.g. 2.4 for 1:2.4. */
  riskReward: number;
  /** Pips of risk between entry and stop. */
  riskPips: number;
  /** Pips of reward between entry and target. */
  rewardPips: number;
  /** ISO timestamp the signal was issued. */
  createdAt: string;
  /** Short analysis note. */
  note: string;
  /** Live price for active signals (illustrative). */
  currentPrice?: number;
  /** For engine-generated signals: the indicator rules that fired. */
  reasons?: string[];
}

export interface HistorySignal extends Signal {
  outcome: SignalOutcome;
  exit: number;
  /** Net pips realised (positive for win, negative for loss). */
  pips: number;
  closedAt: string;
}

export interface PairPerformance {
  pair: string;
  signals: number;
  wins: number;
  losses: number;
  winRate: number;
  pips: number;
}

export interface TimeframePerformance {
  timeframe: Timeframe;
  signals: number;
  winRate: number;
  pips: number;
  avgRiskReward: number;
}

export interface DirectionPerformance {
  direction: Direction;
  signals: number;
  wins: number;
  winRate: number;
  pips: number;
}

export interface PerformancePoint {
  /** Period label, e.g. "Mon" or "Wk 1". */
  label: string;
  wins: number;
  losses: number;
  pips: number;
  /** Cumulative pips up to and including this period. */
  cumulativePips: number;
}

export interface MarketSession {
  name: MarketSessionName;
  /** UTC open hour (0–23). */
  openUtc: number;
  /** UTC close hour (0–23). */
  closeUtc: number;
  city: string;
}

export interface ActivityItem {
  id: string;
  type: "signal" | "target" | "stop" | "watchlist" | "system";
  title: string;
  detail: string;
  time: string; // ISO
}

export interface AnalyticsSummary {
  totalSignals: number;
  winRate: number;
  netPips: number;
  avgRiskReward: number;
  bestPair: string;
  activeSignals: number;
  avgConfidence: number;
  profitFactor: number;
}
