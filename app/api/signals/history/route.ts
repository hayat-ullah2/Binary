import { NextResponse } from "next/server";
import { getHistorySignals } from "@/lib/db/queries";
import { HISTORY } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

/** Closed signal history from the database (demo fallback on error). */
export async function GET() {
  try {
    const history = await getHistorySignals();
    return NextResponse.json({ history, source: "db" });
  } catch (err) {
    return NextResponse.json({
      history: HISTORY,
      source: "demo",
      note: `Database unavailable, showing demo data (${(err as Error).message}).`,
    });
  }
}
