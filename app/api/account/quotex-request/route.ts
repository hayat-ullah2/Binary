import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authUser } from "@/lib/db/auth-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.approvalStatus === "APPROVED") {
    return NextResponse.json(
      { error: "Your account is already approved" },
      { status: 409 }
    );
  }

  let body: { quotexAccountId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.quotexAccountId !== "string") {
    return NextResponse.json(
      { error: "Enter your Quotex Account ID / UID" },
      { status: 400 }
    );
  }

  const quotexAccountId = body.quotexAccountId.trim();
  if (
    quotexAccountId.length < 3 ||
    quotexAccountId.length > 64 ||
    !/^[a-zA-Z0-9._-]+$/.test(quotexAccountId)
  ) {
    return NextResponse.json(
      { error: "Enter a valid Quotex Account ID / UID" },
      { status: 400 }
    );
  }

  try {
    const [user] = await db
      .update(authUser)
      .set({
        quotexAccountId,
        approvalStatus: "PENDING",
        updatedAt: new Date(),
      })
      .where(eq(authUser.id, session.user.id))
      .returning({
        quotexAccountId: authUser.quotexAccountId,
        approvalStatus: authUser.approvalStatus,
      });

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to submit Quotex access request", error);
    return NextResponse.json(
      { error: "Unable to submit your access request" },
      { status: 500 }
    );
  }
}
