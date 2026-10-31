import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST { password } → sets the admin session cookie when the password matches. */
export async function POST(req: Request) {
  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const expected = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!expected || !sessionSecret) {
    return NextResponse.json(
      { error: "Admin authentication is not configured" },
      { status: 503 }
    );
  }

  if (typeof body.password !== "string" || body.password !== expected) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", sessionSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
