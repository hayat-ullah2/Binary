import { NextResponse } from "next/server";
import { createLicenseKey, listLicenseKeys } from "@/lib/db/license-queries";
import { LICENSE_PLANS, type LicensePlan } from "@/types/admin";

export const dynamic = "force-dynamic";

/** GET → all license keys (newest first). */
export async function GET() {
  try {
    const keys = await listLicenseKeys();
    return NextResponse.json({ keys });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

/** POST { label?, email?, plan?, maxActivations?, expiresInDays? } → create. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const plan = LICENSE_PLANS.includes(body.plan as LicensePlan)
    ? (body.plan as LicensePlan)
    : "Trial";

  try {
    const key = await createLicenseKey({
      label: typeof body.label === "string" ? body.label : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      plan,
      maxActivations:
        typeof body.maxActivations === "number" && body.maxActivations > 0
          ? Math.floor(body.maxActivations)
          : undefined,
      expiresInDays:
        body.expiresInDays === null
          ? null
          : typeof body.expiresInDays === "number"
            ? body.expiresInDays
            : undefined,
    });
    return NextResponse.json({ key }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
