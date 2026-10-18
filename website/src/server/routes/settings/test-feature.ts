import { NextResponse } from "next/server";
import { updateTestFeatureSetting } from "@/server/lib/game-server-settings";
import { getSession } from "@/server/lib/session";
import { isAdmin } from "@/shared/token";

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json(
      { error: "enabled must be a boolean" },
      { status: 400 },
    );
  }

  const setting = await updateTestFeatureSetting(body.enabled);
  if (!setting) {
    return NextResponse.json(
      { error: "Could not update the game server setting" },
      { status: 502 },
    );
  }

  return NextResponse.json(setting);
}
