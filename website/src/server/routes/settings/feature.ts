import { NextResponse } from "next/server";
import { updateFeatureSetting } from "@/server/lib/game-server-settings";
import { getSession } from "@/server/lib/session";
import { isFeatureKey } from "@/shared/features";
import { isAdmin } from "@/shared/token";

export async function PUT(request: Request, featureKey: string) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  if (!isFeatureKey(featureKey)) {
    return NextResponse.json({ error: "Unknown feature" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json(
      { error: "enabled must be a boolean" },
      { status: 400 },
    );
  }

  const setting = await updateFeatureSetting(featureKey, body.enabled);
  if (!setting) {
    return NextResponse.json(
      { error: "Could not update the game server setting" },
      { status: 502 },
    );
  }

  return NextResponse.json(setting);
}
