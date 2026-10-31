import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authUser } from "@/lib/db/auth-schema";

export const dynamic = "force-dynamic";

/** GET → list registered users for admin review. */
export async function GET() {
  try {
    const users = await db
      .select({
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        quotexAccountId: authUser.quotexAccountId,
        approvalStatus: authUser.approvalStatus,
        createdAt: authUser.createdAt,
      })
      .from(authUser)
      .orderBy(desc(authUser.createdAt));
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to list registered users", error);
    return NextResponse.json(
      { error: "Unable to load registered users" },
      { status: 500 }
    );
  }
}
