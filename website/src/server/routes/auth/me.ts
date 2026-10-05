import { NextResponse } from "next/server";
import { getSession } from "@/server/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { token: _token, ...publicSession } = session;
  return NextResponse.json(publicSession);
}
