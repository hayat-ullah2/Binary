import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Protects admin routes with the admin cookie and user routes with Better Auth.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isPublic =
    pathname === "/admin/login" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout";

  if (isAdminRoute) {
    if (isPublic) return NextResponse.next();

    const secret = process.env.ADMIN_SESSION_SECRET;
    const authed =
      typeof secret === "string" &&
      secret.length > 0 &&
      req.cookies.get("admin_session")?.value === secret;
    if (authed) return NextResponse.next();

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (pathname === "/") return NextResponse.next();

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (
    pathname === "/api/account/quotex-request" ||
    pathname === "/api/account/status"
  ) {
    return NextResponse.next();
  }

  if (session.user.approvalStatus !== "APPROVED") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Your account has not been approved" },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
