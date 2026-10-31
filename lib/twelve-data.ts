import { getPair, CURRENCY_PAIRS } from "@/lib/mock-data";
import type { Quote, Timeframe } from "@/types/forex";

/**
 * Twelve Data client (https://twelvedata.com).
 * Free tier: ~8 requests/minute, ~800/day — so we batch symbols into a single
 * request wherever possible and keep intervals coarse.
 *
 * Our internal symbols are compact (e.g. "EURUSD"); Twelve Data uses the
 * slashed form (e.g. "EUR/USD") which equals our CurrencyPair.label.
 */

const TD_BASE = "https://api.twelvedata.com";

export class TwelveDataError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "TwelveDataError";
    this.code = code;
  }
}

function apiKey(): string {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) throw new TwelveDataError("TWELVE_DATA_API_KEY is not set in .env");
  return key;
}

/** Internal "EURUSD" → Twelve Data "EUR/USD". */
export function toTdSymbol(symbol: string): string {
  return getPair(symbol).label;
}

/** Twelve Data "EUR/USD" → internal "EURUSD". */
export function fromTdSymbol(tdSymbol: string): string {
  return tdSymbol.replace("/", "");
}

/** Map our timeframe to a Twelve Data interval string. */
const TD_INTERVAL: Record<Timeframe, string> = {
  M15: "15min",
  M30: "30min",
  H1: "1h",
  H4: "4h",
  D1: "1day",
};

interface TdQuoteRaw {
  symbol?: string;
  name?: string;
  close?: string;
  previous_close?: string;
  open?: string;
  high?: string;
  low?: string;
  change?: string;
  percent_change?: string;
  is_market_open?: boolean;
  status?: string;
  code?: number;
  message?: string;
}

export interface TdQuote {
  symbol: string; // internal symbol, e.g. "EURUSD"
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  percentChange: number;
  isMarketOpen: boolean;
}

async function tdFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${TD_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey());

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new TwelveDataError(`HTTP ${res.status} from Twelve Data`, res.status);
  }
  const json = (await res.json()) as T & { status?: string; code?: number; message?: string };
  if (json && json.status === "error") {
    throw new TwelveDataError(json.message ?? "Twelve Data error", json.code);
  }
  return json;
}

function num(v: string | undefined, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Fetch latest quotes for one or more internal symbols in a SINGLE request.
 * Returns a map keyed by internal symbol. Symbols that error individually are
 * omitted from the result.
 */
export async function fetchQuotes(
  symbols: string[]
): Promise<Record<string, TdQuote>> {
  if (symbols.length === 0) return {};
  const tdSymbols = symbols.map(toTdSymbol);
  const raw = await tdFetch<Record<string, TdQuoteRaw> | TdQuoteRaw>("quote", {
    symbol: tdSymbols.join(","),
  });

  // Single symbol → object; multiple → keyed by TD symbol.
  const entries: Array<[string, TdQuoteRaw]> =
    tdSymbols.length === 1
      ? [[tdSymbols[0], raw as TdQuoteRaw]]
      : Object.entries(raw as Record<string, TdQuoteRaw>);

  const out: Record<string, TdQuote> = {};
  for (const [tdSym, q] of entries) {
    if (!q || q.status === "error" || q.close == null) continue;
    const internal = fromTdSymbol(tdSym);
    out[internal] = {
      symbol: internal,
      price: num(q.close),
      open: num(q.open),
      high: num(q.high),
      low: num(q.low),
      previousClose: num(q.previous_close),
      change: num(q.change),
      percentChange: num(q.percent_change),
      isMarketOpen: Boolean(q.is_market_open),
    };
  }
  return out;
}

interface TdTimeSeriesRaw {
  values?: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
  }>;
  status?: string;
}

export interface TdCandle {
  time: string; // ISO
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Fetch OHLC candles for a single symbol/timeframe (oldest → newest). */
export async function fetchTimeSeries(
  symbol: string,
  timeframe: Timeframe = "H1",
  outputsize = 60
): Promise<TdCandle[]> {
  const raw = await tdFetch<TdTimeSeriesRaw>("time_series", {
    symbol: toTdSymbol(symbol),
    interval: TD_INTERVAL[timeframe],
    outputsize: String(outputsize),
    order: "ASC",
  });
  return (raw.values ?? []).map((v) => ({
    time: new Date(v.datetime.replace(" ", "T") + "Z").toISOString(),
    open: num(v.open),
    high: num(v.high),
    low: num(v.low),
    close: num(v.close),
  }));
}

/**
 * Convert a Twelve Data quote into our app's Quote shape. Twelve Data's free
 * tier doesn't expose bid/ask, so we synthesize them from the mid price using
 * a conventional spread per instrument. Sparkline is optional (from candles).
 */
export function toAppQuote(td: TdQuote, sparkline: number[] = []): Quote {
  const pair = getPair(td.symbol);
  const spreadPips = pair.category === "Metal" ? 18 : pair.quote === "JPY" ? 1.4 : 0.6;
  const half = (spreadPips * pair.pipSize) / 2;
  const round = (n: number) => Number(n.toFixed(pair.decimals));
  return {
    symbol: td.symbol,
    bid: round(td.price - half),
    ask: round(td.price + half),
    spread: Number(spreadPips.toFixed(1)),
    dayChange: round(td.change),
    dayChangePercent: Number(td.percentChange.toFixed(2)),
    dayHigh: round(td.high),
    dayLow: round(td.low),
    sparkline: sparkline.length ? sparkline : [td.previousClose || td.price, td.price],
  };
}

/** All internal symbols we track, for convenience. */
export const ALL_SYMBOLS = CURRENCY_PAIRS.map((p) => p.symbol);
