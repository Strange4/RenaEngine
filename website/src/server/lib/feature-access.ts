import { getFeatureSetting } from "@/server/lib/game-server-settings";
import { getSession } from "@/server/lib/session";
import type { FeatureKey } from "@/shared/features";
import { isAdmin } from "@/shared/token";

export type FeatureAccess =
  | { status: "unauthenticated" }
  | { status: "disabled" }
  | { status: "allowed"; admin: boolean };

export async function getFeatureAccess(
  featureKey: FeatureKey,
): Promise<FeatureAccess> {
  const session = await getSession();
  if (!session) return { status: "unauthenticated" };
  if (isAdmin(session)) return { status: "allowed", admin: true };

  const setting = await getFeatureSetting(featureKey);
  return setting?.enabled
    ? { status: "allowed", admin: false }
    : { status: "disabled" };
}
