import { NextResponse } from "next/server";
import { getSession } from "@/server/lib/session";
import { isAdmin } from "@/shared/token";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    role: session.role,
    id: isAdmin(session) ? "admin" : String(session.participantId),
  });
}
