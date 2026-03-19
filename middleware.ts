import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes — no auth required
  if (
    pathname.startsWith("/api/auth") ||
    pathname.match(/^\/api\/clients\/[^/]+\/vcard$/) ||
    pathname.startsWith("/api/analytics/track")
  ) {
    return NextResponse.next();
  }

  // Protected: /admin/* and /api/clients/* and /api/upload and /api/crm/keys
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/clients") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/crm/keys")
  ) {
    // Allow login page without auth
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    // Check for session token cookie (set by next-auth)
    const token =
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
