import Link from "next/link";
import { redirect } from "next/navigation";
import FeatureToggleControl from "@/app/components/FeatureToggleControl";
import LogoutButton from "@/app/components/LogoutButton";
import { getTestFeatureSetting } from "@/server/lib/game-server-settings";
import { getSession } from "@/server/lib/session";
import { isAdmin } from "@/shared/token";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/access-denied");
  const setting = await getTestFeatureSetting();

  return (
    <main>
      <h1>Admin</h1>
      <FeatureToggleControl initialEnabled={setting?.enabled ?? null} />
      <p>
        <Link href="/test-feature">Open test feature</Link>
      </p>
      <LogoutButton />
    </main>
  );
}
