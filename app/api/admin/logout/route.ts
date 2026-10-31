import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST → clears the admin session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
