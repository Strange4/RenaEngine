import { getFeatureSetting } from "@/server/lib/game-server-settings";
import { getSession } from "@/server/lib/session";
import { FeatureAccessStatus, type FeatureKey } from "@/shared/features";
import { isAdmin } from "@/shared/token";

export type FeatureAccess =
  | { status: FeatureAccessStatus.Unauthenticated }
  | { status: FeatureAccessStatus.Disabled }
  | { status: FeatureAccessStatus.Allowed; admin: boolean };

export async function getFeatureAccess(
  featureKey: FeatureKey,
): Promise<FeatureAccess> {
  const session = await getSession();
  if (!session) return { status: FeatureAccessStatus.Unauthenticated };
  if (isAdmin(session)) return { status: FeatureAccessStatus.Allowed, admin: true };

  const setting = await getFeatureSetting(featureKey);
  return setting?.enabled
    ? { status: FeatureAccessStatus.Allowed, admin: false }
    : { status: FeatureAccessStatus.Disabled };
}
