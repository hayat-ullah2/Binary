import "dotenv/config";
import { fetchQuotes, fetchTimeSeries } from "@/lib/twelve-data";

/**
 * Verifies the Twelve Data API key by pulling a few live quotes + one candle
 * series in a single batched request each. Run with: npm run td:check
 */
async function main() {
  const symbols = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"];

  console.log("Fetching live quotes (1 batched request)…");
  const quotes = await fetchQuotes(symbols);
  const got = Object.keys(quotes);
  if (got.length === 0) throw new Error("No quotes returned — check the API key / plan.");

  for (const s of symbols) {
    const q = quotes[s];
    if (q) {
      console.log(
        `  ${s.padEnd(7)} price=${q.price}  chg%=${q.percentChange}  market=${q.isMarketOpen ? "open" : "closed"}`
      );
    } else {
      console.log(`  ${s.padEnd(7)} (not returned — may be unsupported on this plan)`);
    }
  }

  console.log("\nFetching EUR/USD H1 candles…");
  const candles = await fetchTimeSeries("EURUSD", "H1", 5);
  console.log(`  ✓ ${candles.length} candles; latest close = ${candles.at(-1)?.close}`);

  console.log("\n✓ Twelve Data API key is working.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Twelve Data check failed:", err.message);
    process.exit(1);
  });
