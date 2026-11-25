import {
  pgTable,
  pgEnum,
  text,
  integer,
  doublePrecision,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";

export {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from "./auth-schema";

/**
 * SHARP PRO BOT database schema (Neon PostgreSQL via Drizzle ORM).
 * Mirrors types/forex.ts so the app can migrate from mock data to the DB.
 */

export const directionEnum = pgEnum("direction", ["BUY", "SELL"]);
export const timeframeEnum = pgEnum("timeframe", ["M15", "M30", "H1", "H4", "D1"]);
export const signalStatusEnum = pgEnum("signal_status", [
  "ACTIVE",
  "PENDING",
  "TARGET_HIT",
  "STOP_HIT",
  "EXPIRED",
]);
export const signalOutcomeEnum = pgEnum("signal_outcome", [
  "WIN",
  "LOSS",
  "BREAKEVEN",
]);
export const pairCategoryEnum = pgEnum("pair_category", [
  "Major",
  "Minor",
  "Metal",
]);

export const licenseStatusEnum = pgEnum("license_status", [
  "ACTIVE",
  "INACTIVE",
  "REVOKED",
]);

export const licensePlanEnum = pgEnum("license_plan", [
  "Trial",
  "Monthly",
  "Quarterly",
  "Lifetime",
]);

export const currencyPairs = pgTable("currency_pairs", {
  symbol: text("symbol").primaryKey(), // e.g. "EURUSD"
  label: text("label").notNull(), // e.g. "EUR/USD"
  base: text("base").notNull(),
  quote: text("quote").notNull(),
  category: pairCategoryEnum("category").notNull(),
  decimals: integer("decimals").notNull(),
  pipSize: doublePrecision("pip_size").notNull(),
});

export const quotes = pgTable("quotes", {
  symbol: text("symbol")
    .primaryKey()
    .references(() => currencyPairs.symbol, { onDelete: "cascade" }),
  bid: doublePrecision("bid").notNull(),
  ask: doublePrecision("ask").notNull(),
  spread: doublePrecision("spread").notNull(),
  dayChange: doublePrecision("day_change").notNull(),
  dayChangePercent: doublePrecision("day_change_percent").notNull(),
  dayHigh: doublePrecision("day_high").notNull(),
  dayLow: doublePrecision("day_low").notNull(),
  sparkline: doublePrecision("sparkline").array().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const signals = pgTable(
  "signals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pairSymbol: text("pair_symbol")
      .notNull()
      .references(() => currencyPairs.symbol, { onDelete: "cascade" }),
    direction: directionEnum("direction").notNull(),
    status: signalStatusEnum("status").notNull().default("ACTIVE"),
    timeframe: timeframeEnum("timeframe").notNull(),
    entry: doublePrecision("entry").notNull(),
    stopLoss: doublePrecision("stop_loss").notNull(),
    takeProfit: doublePrecision("take_profit").notNull(),
    confidence: integer("confidence").notNull(), // 0–100 (illustrative)
    riskReward: doublePrecision("risk_reward").notNull(),
    riskPips: doublePrecision("risk_pips").notNull(),
    rewardPips: doublePrecision("reward_pips").notNull(),
    note: text("note").notNull().default(""),
    currentPrice: doublePrecision("current_price"),

    // Populated once the signal closes (history).
    outcome: signalOutcomeEnum("outcome"),
    exit: doublePrecision("exit"),
    pips: doublePrecision("pips"),
    closedAt: timestamp("closed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("signals_status_idx").on(t.status),
    index("signals_pair_idx").on(t.pairSymbol),
    index("signals_created_idx").on(t.createdAt),
  ]
);

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    symbol: text("symbol")
      .notNull()
      .references(() => currencyPairs.symbol, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique("watchlist_symbol_unique").on(t.symbol)]
);

/** Bot activation / license keys managed from the admin panel. */
export const licenseKeys = pgTable(
  "license_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull(),
    label: text("label").notNull().default(""),
    email: text("email"),
    plan: licensePlanEnum("plan").notNull().default("Trial"),
    status: licenseStatusEnum("status").notNull().default("ACTIVE"),
    activations: integer("activations").notNull().default(0),
    maxActivations: integer("max_activations").notNull().default(1),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("license_key_unique").on(t.key),
    index("license_status_idx").on(t.status),
    index("license_created_idx").on(t.createdAt),
  ]
);

// Convenience inferred types
export type CurrencyPairRow = typeof currencyPairs.$inferSelect;
export type QuoteRow = typeof quotes.$inferSelect;
export type SignalRow = typeof signals.$inferSelect;
export type WatchlistRow = typeof watchlistItems.$inferSelect;
export type LicenseKeyRow = typeof licenseKeys.$inferSelect;
