// AI contribution: Below 50% AI-generated
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/lib/session";
import { getDb } from "@/server/lib/db";
import { hashToken } from "@/server/lib/token-hash";
import { parseToken } from "@/shared/token";

// Returns true when the path is the route itself or a page nested under it,
// e.g. "/admin" and "/admin/users" match "/admin", but "/administrator" does not.
function isWithinRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

// Validates token against DB; returns role and isAdmin flag, or null if invalid
function validateTokenInDb(token: string | undefined): { role: string; isAdmin: boolean } | null {
  if (!token) return null;

  // 1. Verify format
  const parsed = parseToken(token);
  if (!parsed) return null;

  // 2. Check if hash exists in DB
  const db = getDb();
  const user = db
    .prepare("SELECT role FROM users WHERE token_hash = ?")
    .get(hashToken(token)) as { role: string } | undefined;

  if (!user) return null;

  return { role: user.role, isAdmin: user.role === "admin" };
}

function redirectPathFor(
  pathname: string,
  auth: { role: string; isAdmin: boolean } | null,
): string | null {
  if (!auth) return "/login";
  if (isWithinRoute(pathname, "/admin") && !auth.isAdmin) return "/access-denied";
  if (isWithinRoute(pathname, "/participant") && auth.isAdmin) return "/admin";
  return null;
}

// Checks the session cookie before protected pages render.
// Pages still check the session themselves, so this is a first line of defense only.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const auth = validateTokenInDb(token);
  const redirectPath = redirectPathFor(request.nextUrl.pathname, auth);
  if (!redirectPath) return NextResponse.next();
  return NextResponse.redirect(new URL(redirectPath, request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/participant/:path*"],
};
