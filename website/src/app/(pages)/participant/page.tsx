import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/app/components/LogoutButton";
import SdkDownloadPanel from "@/app/components/SdkDownloadPanel";
import { getFeatureAccess } from "@/server/lib/feature-access";
import { getSession } from "@/server/lib/session";
import { SDK_DOWNLOADS_FEATURE } from "@/shared/features";
import { isAdmin } from "@/shared/token";

export default async function ParticipantPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isAdmin(session)) redirect("/admin");
  const sdkAccess = await getFeatureAccess(SDK_DOWNLOADS_FEATURE.key);

  return (
    <main>
      <h1>Participant #{session.participantId}</h1>
      {sdkAccess.status === "allowed" ? (
        <SdkDownloadPanel />
      ) : (
        <p className="sdk-download-unavailable">
          Starter SDK downloads are currently unavailable.
        </p>
      )}
      <p>
        <Link href="/test-feature">Open test feature</Link>
      </p>
      <LogoutButton />
    </main>
  );
}
