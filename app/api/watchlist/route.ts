import { NextResponse } from "next/server";
import {
  addToWatchlist,
  getWatchlistSymbols,
  removeFromWatchlist,
} from "@/lib/db/queries";
import { PAIR_MAP, DEFAULT_WATCHLIST } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

function isValidSymbol(symbol: unknown): symbol is string {
  return typeof symbol === "string" && symbol in PAIR_MAP;
}

/** GET → ordered list of watched symbols. */
export async function GET() {
  try {
    const symbols = await getWatchlistSymbols();
    return NextResponse.json({ symbols, source: "db" });
  } catch (err) {
    return NextResponse.json({
      symbols: DEFAULT_WATCHLIST,
      source: "demo",
      note: `Database unavailable (${(err as Error).message}).`,
    });
  }
}

/** POST { symbol } → add a pair to the watchlist. */
export async function POST(req: Request) {
  let body: { symbol?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isValidSymbol(body.symbol)) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
  }
  try {
    const symbols = await addToWatchlist(body.symbol);
    return NextResponse.json({ symbols, source: "db" });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

/** DELETE ?symbol=EURUSD → remove a pair from the watchlist. */
export async function DELETE(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol");
  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
  }
  try {
    const symbols = await removeFromWatchlist(symbol);
    return NextResponse.json({ symbols, source: "db" });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
