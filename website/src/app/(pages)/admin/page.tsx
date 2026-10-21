import Link from "next/link";
import { redirect } from "next/navigation";
import FeatureToggleControl from "@/app/components/FeatureToggleControl";
import LogoutButton from "@/app/components/LogoutButton";
import { getFeatureSetting } from "@/server/lib/game-server-settings";
import { getSession } from "@/server/lib/session";
import { FEATURES } from "@/shared/features";
import { isAdmin } from "@/shared/token";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/access-denied");
  const features = await Promise.all(
    FEATURES.map(async (feature) => ({
      feature,
      setting: await getFeatureSetting(feature.key),
    })),
  );

  return (
    <main>
      <h1>Admin</h1>
      {features.map(({ feature, setting }) => (
        <div key={feature.key}>
          <FeatureToggleControl
            feature={feature}
            initialEnabled={setting?.enabled ?? null}
          />
          <p>
            <Link href={feature.path}>Open {feature.label.toLowerCase()}</Link>
          </p>
        </div>
      ))}
      <LogoutButton />
    </main>
  );
}
