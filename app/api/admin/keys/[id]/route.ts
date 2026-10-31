import { NextResponse } from "next/server";
import { deleteLicenseKey, setLicenseStatus } from "@/lib/db/license-queries";

export const dynamic = "force-dynamic";

const ALLOWED = ["ACTIVE", "INACTIVE", "REVOKED"] as const;
type AllowedStatus = (typeof ALLOWED)[number];

/** PATCH { status } → activate / deactivate / revoke a key. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!ALLOWED.includes(body.status as AllowedStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  try {
    const key = await setLicenseStatus(id, body.status as AllowedStatus);
    if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ key });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/** DELETE → permanently remove a key. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ok = await deleteLicenseKey(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
