import { and, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authUser } from "@/lib/db/auth-schema";

export const dynamic = "force-dynamic";

const APPROVAL_STATUSES = ["APPROVED", "REJECTED"] as const;
type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** PATCH { status } → approve or reject a registered user. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!APPROVAL_STATUSES.includes(body.status as ApprovalStatus)) {
    return NextResponse.json({ error: "Invalid approval status" }, { status: 400 });
  }

  try {
    if (body.status === "APPROVED") {
      const [existingUser] = await db
        .select({ quotexAccountId: authUser.quotexAccountId })
        .from(authUser)
        .where(eq(authUser.id, id))
        .limit(1);
      if (!existingUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (!existingUser.quotexAccountId) {
        return NextResponse.json(
          { error: "The user must submit a Quotex Account ID / UID first" },
          { status: 400 }
        );
      }
    }

    const [user] = await db
      .update(authUser)
      .set({
        approvalStatus: body.status as ApprovalStatus,
        updatedAt: new Date(),
      })
      .where(
        body.status === "APPROVED"
          ? and(eq(authUser.id, id), isNotNull(authUser.quotexAccountId))
          : eq(authUser.id, id)
      )
      .returning({
        id: authUser.id,
        quotexAccountId: authUser.quotexAccountId,
        approvalStatus: authUser.approvalStatus,
      });

    if (!user) {
      return NextResponse.json(
        {
          error:
            body.status === "APPROVED"
              ? "The user must submit a Quotex Account ID / UID first"
              : "User not found",
        },
        { status: body.status === "APPROVED" ? 400 : 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to update user approval", error);
    return NextResponse.json(
      { error: "Unable to update user approval" },
      { status: 500 }
    );
  }
}
