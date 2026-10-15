import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/lib/session";
import { isAdmin, parseToken, type ParsedToken } from "@/shared/token";

// Returns true when the path is the given section or a page inside it.
function isInSection(pathname: string, section: string): boolean {
  return pathname === section || pathname.startsWith(`${section}/`);
}

// Returns the path to send the visitor to, or null when they may view the page.
function redirectPathFor(
  pathname: string,
  session: ParsedToken | null,
): string | null {
  if (!session) return "/login";
  if (isInSection(pathname, "/admin") && !isAdmin(session)) return "/access-denied";
  if (isInSection(pathname, "/participant") && isAdmin(session)) return "/admin";
  return null;
}

// Checks the session cookie before protected pages render.
// Pages still check the session themselves, so this is a first line of defense only.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? parseToken(token) : null;
  const redirectPath = redirectPathFor(request.nextUrl.pathname, session);
  if (!redirectPath) return NextResponse.next();
  return NextResponse.redirect(new URL(redirectPath, request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/participant/:path*"],
};
