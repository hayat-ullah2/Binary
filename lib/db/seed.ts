import "dotenv/config";
import { db, currencyPairs, quotes, signals, watchlistItems } from "@/lib/db";
import {
  CURRENCY_PAIRS,
  QUOTES,
  SIGNALS,
  HISTORY,
  DEFAULT_WATCHLIST,
} from "@/lib/mock-data";

/**
 * Seeds Neon with the existing demonstration data so the dynamic app has the
 * same content as the static prototype. Idempotent: clears the tables first.
 * Run with: npm run db:seed
 */
async function main() {
  console.log("Seeding database…");

  // Clear in dependency order (children first).
  await db.delete(signals);
  await db.delete(quotes);
  await db.delete(watchlistItems);
  await db.delete(currencyPairs);

  // Currency pairs
  await db.insert(currencyPairs).values(
    CURRENCY_PAIRS.map((p) => ({
      symbol: p.symbol,
      label: p.label,
      base: p.base,
      quote: p.quote,
      category: p.category,
      decimals: p.decimals,
      pipSize: p.pipSize,
    }))
  );
  console.log(`  ✓ ${CURRENCY_PAIRS.length} currency pairs`);

  // Quotes
  await db.insert(quotes).values(
    QUOTES.map((q) => ({
      symbol: q.symbol,
      bid: q.bid,
      ask: q.ask,
      spread: q.spread,
      dayChange: q.dayChange,
      dayChangePercent: q.dayChangePercent,
      dayHigh: q.dayHigh,
      dayLow: q.dayLow,
      sparkline: q.sparkline,
    }))
  );
  console.log(`  ✓ ${QUOTES.length} quotes`);

  // Signals: active/recent + closed history in one table
  const activeRows = SIGNALS.map((s) => ({
    id: s.id,
    pairSymbol: s.pair,
    direction: s.direction,
    status: s.status,
    timeframe: s.timeframe,
    entry: s.entry,
    stopLoss: s.stopLoss,
    takeProfit: s.takeProfit,
    confidence: s.confidence,
    riskReward: s.riskReward,
    riskPips: s.riskPips,
    rewardPips: s.rewardPips,
    note: s.note,
    currentPrice: s.currentPrice ?? null,
    createdAt: new Date(s.createdAt),
  }));

  const historyRows = HISTORY.map((h) => ({
    id: h.id,
    pairSymbol: h.pair,
    direction: h.direction,
    status: h.status,
    timeframe: h.timeframe,
    entry: h.entry,
    stopLoss: h.stopLoss,
    takeProfit: h.takeProfit,
    confidence: h.confidence,
    riskReward: h.riskReward,
    riskPips: h.riskPips,
    rewardPips: h.rewardPips,
    note: h.note,
    outcome: h.outcome,
    exit: h.exit,
    pips: h.pips,
    closedAt: new Date(h.closedAt),
    createdAt: new Date(h.createdAt),
  }));

  await db.insert(signals).values([...activeRows, ...historyRows]);
  console.log(`  ✓ ${activeRows.length + historyRows.length} signals`);

  // Watchlist
  await db.insert(watchlistItems).values(
    DEFAULT_WATCHLIST.map((symbol, i) => ({ symbol, position: i }))
  );
  console.log(`  ✓ ${DEFAULT_WATCHLIST.length} watchlist items`);

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
