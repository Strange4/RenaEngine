import { NextResponse } from "next/server";
import { parseToken } from "@/shared/token";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const parsed = parseToken(token);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
  }

  // TODO: verify the token against the game server once it exposes an auth endpoint.
  const response = NextResponse.json(parsed);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
