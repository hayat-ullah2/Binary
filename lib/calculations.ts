import type { CurrencyPair } from "@/types/forex";

/**
 * Risk-calculator math. These are illustrative calculations for a UI demo.
 * Real pip values and position sizes depend on the instrument, the account
 * currency, and the broker's contract specifications.
 */

export interface RiskInput {
  accountBalance: number;
  riskPercent: number;
  entry: number;
  stopLoss: number;
  takeProfit?: number;
  pair: CurrencyPair;
}

export interface RiskResult {
  riskAmount: number;
  stopDistancePips: number;
  rewardDistancePips: number | null;
  riskReward: number | null;
  /** Approximate position size in standard lots (illustrative). */
  positionSizeLots: number;
  /** Position size in units of the base currency (illustrative). */
  positionSizeUnits: number;
  potentialReward: number | null;
  /** Approximate value of one pip per standard lot, in account currency. */
  pipValuePerLot: number;
}

/** Pips between two prices for a given instrument. */
export function priceToPips(from: number, to: number, pair: CurrencyPair): number {
  return Math.abs(to - from) / pair.pipSize;
}

/**
 * Illustrative pip value per standard lot (100,000 units) in USD.
 * For USD-quoted pairs this is ~$10/pip; for JPY quotes ~ $6–7/pip; metals differ.
 * We approximate using the quote currency and the current price.
 */
export function pipValuePerStandardLot(pair: CurrencyPair): number {
  const contractSize = pair.category === "Metal" ? 100 : 100_000;
  // Value of one pip = pipSize * contractSize, expressed in the quote currency.
  const inQuote = pair.pipSize * contractSize;
  // For a USD account we assume USD-quoted pairs convert 1:1 and approximate
  // JPY quotes at ~150 JPY/USD. This is a demonstration approximation only.
  if (pair.quote === "USD") return inQuote;
  if (pair.quote === "JPY") return inQuote / 150;
  return inQuote; // fallback approximation
}

export function computeRisk(input: RiskInput): RiskResult {
  const { accountBalance, riskPercent, entry, stopLoss, takeProfit, pair } = input;

  const riskAmount = (accountBalance * riskPercent) / 100;
  const stopDistancePips = priceToPips(entry, stopLoss, pair);
  const pipValuePerLot = pipValuePerStandardLot(pair);

  const rewardDistancePips =
    takeProfit != null ? priceToPips(entry, takeProfit, pair) : null;

  const riskReward =
    rewardDistancePips != null && stopDistancePips > 0
      ? rewardDistancePips / stopDistancePips
      : null;

  // Lots so that (stopPips * pipValuePerLot * lots) === riskAmount
  const riskPerLot = stopDistancePips * pipValuePerLot;
  const positionSizeLots = riskPerLot > 0 ? riskAmount / riskPerLot : 0;

  const contractSize = pair.category === "Metal" ? 100 : 100_000;
  const positionSizeUnits = positionSizeLots * contractSize;

  const potentialReward =
    rewardDistancePips != null
      ? rewardDistancePips * pipValuePerLot * positionSizeLots
      : null;

  return {
    riskAmount,
    stopDistancePips,
    rewardDistancePips,
    riskReward,
    positionSizeLots,
    positionSizeUnits,
    potentialReward,
    pipValuePerLot,
  };
}

/** Validate that a stop/target sit on the correct side of entry for a direction. */
export function validateLevels(
  direction: "BUY" | "SELL",
  entry: number,
  stopLoss: number,
  takeProfit?: number
): string[] {
  const errors: string[] = [];
  if (direction === "BUY") {
    if (stopLoss >= entry) errors.push("For a BUY, stop-loss must be below entry.");
    if (takeProfit != null && takeProfit <= entry)
      errors.push("For a BUY, take-profit must be above entry.");
  } else {
    if (stopLoss <= entry) errors.push("For a SELL, stop-loss must be above entry.");
    if (takeProfit != null && takeProfit >= entry)
      errors.push("For a SELL, take-profit must be below entry.");
  }
  return errors;
}
