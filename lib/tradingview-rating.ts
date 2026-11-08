import type { Direction } from "@/types/forex";
import type { QuickSignal } from "@/lib/quick-signal";

/**
 * Fetches TradingView's OWN technical-analysis recommendation (Recommend.All,
 * a value from -1 = Strong Sell to +1 = Strong Buy) from its public scanner
 * endpoint and maps it to a BUY/SELL + confidence.
 *
 * NOTE: this is an UNOFFICIAL, undocumented TradingView endpoint — it can change
 * or be blocked at any time, so callers MUST have a fallback. Not affiliated
 * with or endorsed by TradingView. Illustrative, not financial advice.
 */

/** App pair → TradingView ticker + scanner screener. */
const TV_MAP: Record<string, { ticker: string; screener: string }> = {
  EURUSD: { ticker: "FX:EURUSD", screener: "forex" },
  GBPUSD: { ticker: "FX:GBPUSD", screener: "forex" },
  USDJPY: { ticker: "FX:USDJPY", screener: "forex" },
  XAUUSD: { ticker: "OANDA:XAUUSD", screener: "cfd" },
  AUDUSD: { ticker: "FX:AUDUSD", screener: "forex" },
  USDCHF: { ticker: "FX:USDCHF", screener: "forex" },
  EURJPY: { ticker: "FX:EURJPY", screener: "forex" },
  GBPJPY: { ticker: "FX:GBPJPY", screener: "forex" },
  USDCAD: { ticker: "FX:USDCAD", screener: "forex" },
  NZDUSD: { ticker: "FX:NZDUSD", screener: "forex" },
  EURGBP: { ticker: "FX:EURGBP", screener: "forex" },
};

/** Quick-expiry seconds → TradingView scanner interval (minutes). */
function tvInterval(tfSeconds: number): string {
  if (tfSeconds >= 900) return "15";
  if (tfSeconds >= 300) return "5";
  return "1"; // 1m, 2m, 3m
}

export async function fetchTradingViewRating(
  pair: string,
  tfSeconds: number
): Promise<QuickSignal | null> {
  const meta = TV_MAP[pair.toUpperCase()];
  if (!meta) return null;

  const column = `Recommend.All|${tvInterval(tfSeconds)}`;
  try {
    const res = await fetch(
      `https://scanner.tradingview.com/${meta.screener}/scan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        body: JSON.stringify({
          symbols: { tickers: [meta.ticker], query: { types: [] } },
          columns: [column],
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ d?: Array<number | null> }>;
    };
    const rec = json.data?.[0]?.d?.[0];
    if (typeof rec !== "number") return null;

    const direction: Direction = rec >= 0 ? "BUY" : "SELL";
    // |rec| 0..1 → confidence 60..96.
    const confidence = Math.round(
      Math.max(60, Math.min(96, 60 + Math.abs(rec) * 36))
    );
    return { direction, confidence };
  } catch {
    return null;
  }
}
