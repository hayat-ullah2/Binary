import { asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "./index";
import { signals, watchlistItems } from "./schema";
import type { SignalRow } from "./schema";
import type { HistorySignal, Signal } from "@/types/forex";

/** DB row → app Signal. */
export function toSignal(row: SignalRow): Signal {
  return {
    id: row.id,
    pair: row.pairSymbol,
    direction: row.direction,
    status: row.status,
    timeframe: row.timeframe,
    entry: row.entry,
    stopLoss: row.stopLoss,
    takeProfit: row.takeProfit,
    confidence: row.confidence,
    riskReward: row.riskReward,
    riskPips: row.riskPips,
    rewardPips: row.rewardPips,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    currentPrice: row.currentPrice ?? undefined,
  };
}

/** DB row → app HistorySignal (assumes closed rows). */
export function toHistorySignal(row: SignalRow): HistorySignal {
  return {
    ...toSignal(row),
    outcome: row.outcome ?? "BREAKEVEN",
    exit: row.exit ?? row.entry,
    pips: row.pips ?? 0,
    closedAt: (row.closedAt ?? row.createdAt).toISOString(),
  };
}

/** Live / recent signals = rows that have not closed yet. */
export async function getActiveSignals(): Promise<Signal[]> {
  const rows = await db
    .select()
    .from(signals)
    .where(isNull(signals.closedAt))
    .orderBy(desc(signals.createdAt));
  return rows.map(toSignal);
}

/** Closed signals (history) = rows with a closedAt timestamp. */
export async function getHistorySignals(): Promise<HistorySignal[]> {
  const rows = await db
    .select()
    .from(signals)
    .where(isNotNull(signals.closedAt))
    .orderBy(desc(signals.closedAt));
  return rows.map(toHistorySignal);
}

/** Ordered list of watched symbols. */
export async function getWatchlistSymbols(): Promise<string[]> {
  const rows = await db
    .select({ symbol: watchlistItems.symbol, position: watchlistItems.position })
    .from(watchlistItems)
    .orderBy(asc(watchlistItems.position), asc(watchlistItems.createdAt));
  return rows.map((r) => r.symbol);
}

/** Add a symbol to the watchlist (idempotent). Returns the updated list. */
export async function addToWatchlist(symbol: string): Promise<string[]> {
  const existing = await db
    .select({ symbol: watchlistItems.symbol })
    .from(watchlistItems)
    .where(eq(watchlistItems.symbol, symbol));
  if (existing.length === 0) {
    const current = await getWatchlistSymbols();
    await db.insert(watchlistItems).values({ symbol, position: current.length });
  }
  return getWatchlistSymbols();
}

/** Remove a symbol from the watchlist. Returns the updated list. */
export async function removeFromWatchlist(symbol: string): Promise<string[]> {
  await db.delete(watchlistItems).where(eq(watchlistItems.symbol, symbol));
  return getWatchlistSymbols();
}
