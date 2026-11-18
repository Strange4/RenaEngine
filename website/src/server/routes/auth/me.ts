import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/server/lib/db";
import { hashToken } from "@/server/lib/token-hash";
import { SESSION_COOKIE } from "@/server/lib/session";
import { parseToken } from "@/shared/token";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify token format & check DB
  const parsed = parseToken(token);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const db = getDb();
  const user = db
    .prepare("SELECT role FROM users WHERE token_hash = ?")
    .get(hashToken(token)) as { role: string } | undefined;

  if (!user) {
    return NextResponse.json({ error: "Token invalid" }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    role: user.role,
  });
}
