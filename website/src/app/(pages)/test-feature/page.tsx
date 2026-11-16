import { redirect } from "next/navigation";
import FeatureDisabled from "@/app/components/FeatureDisabled";
import { getFeatureAccess } from "@/server/lib/feature-access";
import { FeatureAccessStatus, TEST_FEATURE } from "@/shared/features";

export default async function TestFeaturePage() {
  const access = await getFeatureAccess(TEST_FEATURE.key);
  if (access.status === FeatureAccessStatus.Unauthenticated) redirect("/login");

  if (access.status === FeatureAccessStatus.Disabled) return <FeatureDisabled />;

  return (
    <main>
      <h1>Test Feature</h1>
      <p>The temporary feature is available.</p>
      {access.admin && (
        <p className="hint">Administrator access bypasses the feature switch.</p>
      )}
    </main>
  );
}
