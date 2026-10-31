import { NextResponse } from "next/server";
import { getActiveSignals } from "@/lib/db/queries";
import { SIGNALS } from "@/lib/mock-data";
import type { Signal } from "@/types/forex";

export const dynamic = "force-dynamic";

// Saved signals change on the order of minutes, not seconds — a short in-process
// cache collapses the dashboard + signals-page fetches (and rapid navigation)
// into one DB query per window instead of one per request.
const TTL_MS = 20_000;
type Payload = { signals: Signal[]; source: "db" | "demo"; note?: string };
let cache: { at: number; payload: Payload } | null = null;

/** Live / recent signals from the database (demo fallback on error). */
export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json({ ...cache.payload, cached: true });
  }
  try {
    const signals = await getActiveSignals();
    const payload: Payload = { signals, source: "db" };
    cache = { at: now, payload };
    return NextResponse.json(payload);
  } catch (err) {
    const payload: Payload = {
      signals: SIGNALS,
      source: "demo",
      note: `Database unavailable, showing demo data (${(err as Error).message}).`,
    };
    // Short cache so we retry the DB soon.
    cache = { at: now - (TTL_MS - 5_000), payload };
    return NextResponse.json(payload);
  }
}
