// AI contribution: No substantial AI-generated code
import { NextResponse } from "next/server";
import { getDb } from "@/server/lib/db";
import { hashToken } from "@/server/lib/token-hash";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/lib/session";
import { parseToken } from "@/shared/token";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!token) {
    return NextResponse.json(
      { error: "Token required" },
      { status: 400 },
    );
  }

  // Verify token format (ADMIN-... or PARTICIPANT-{number}-...)
  const parsed = parseToken(token);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid token format" },
      { status: 400 },
    );
  }

  // Check if token hash exists in DB
  const db = getDb();
  const user = db
    .prepare("SELECT id, role FROM users WHERE token_hash = ?")
    .get(hashToken(token)) as { id: number; role: string } | undefined;

  if (!user) {
    return NextResponse.json(
      { error: "Token not found" },
      { status: 401 },
    );
  }

  // Set cookie with the raw token
  const response = NextResponse.json({
    role: user.role,
    id: user.id,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
