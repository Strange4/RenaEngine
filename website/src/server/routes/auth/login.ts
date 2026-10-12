import { NextResponse } from "next/server";
import { buildToken } from "@/shared/credentials";
import { parseToken } from "@/shared/token";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const token = buildToken(id, password);
  const parsed = token ? parseToken(token) : null;
  if (!token || !parsed) {
    return NextResponse.json(
      { error: "Enter ADMIN or a participant number, and a password" },
      { status: 400 },
    );
  }

  // TODO: verify the token against the game server once it exposes an auth endpoint.
  const response = NextResponse.json({
    role: parsed.role,
    id: parsed.role === "admin" ? "admin" : String(parsed.participantId),
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
