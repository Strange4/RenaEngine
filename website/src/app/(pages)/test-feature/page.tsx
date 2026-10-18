import Link from "next/link";
import { redirect } from "next/navigation";
import { getTestFeatureSetting } from "@/server/lib/game-server-settings";
import { getSession } from "@/server/lib/session";
import { isAdmin } from "@/shared/token";

export default async function TestFeaturePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const admin = isAdmin(session);
  const setting = admin ? null : await getTestFeatureSetting();

  if (!admin && setting?.enabled !== true) {
    return (
      <main>
        <h1>Feature Disabled</h1>
        <p>This feature is not currently available to participants.</p>
        <Link href="/participant">Return to participant home</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Test Feature</h1>
      <p>The temporary feature is available.</p>
      {admin && <p className="hint">Administrator access bypasses the feature switch.</p>}
    </main>
  );
}
