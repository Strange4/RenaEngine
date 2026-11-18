import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopBar from "@/app/components/AppTopBar";
import AdminLiveViewerForm from "@/app/components/AdminLiveViewerForm";
import FeatureToggleControl from "@/app/components/FeatureToggleControl";
import ParticipantTokenManager from "@/app/components/ParticipantTokenManager";
import { getFeatureSetting } from "@/server/lib/game-server-settings";
import { getSession } from "@/server/lib/session";
import { listParticipantIds } from "@/server/lib/user-store";
import { FEATURES } from "@/shared/features";
import { isAdmin } from "@/shared/token";
import styles from "./admin.module.css";

// Returns null when the database cannot be read, so the page can show an error.
function loadParticipantIds(): number[] | null {
  try {
    return listParticipantIds();
  } catch (error) {
    console.error("Could not load participant tokens", error);
    return null;
  }
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/access-denied");
  const participantIds = loadParticipantIds();
  const features = await Promise.all(
    FEATURES.map(async (feature) => ({
      feature,
      setting: await getFeatureSetting(feature.key),
    })),
  );

  return (
    <div className={styles.page}>
      <AppTopBar label="Admin" />
      <main className={styles.content}>
        <section className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>Welcome back!</h1>
        </section>
        <div className={styles.dashboard}>
          <section className={`${styles.card} ${styles.tokens}`} aria-labelledby="tokens-title">
            <h2 id="tokens-title">Participant Tokens</h2>
            <p className={styles.description}>Create or revoke access for participants.</p>
            {participantIds ? (
              <ParticipantTokenManager initialParticipantIds={participantIds} />
            ) : (
              <p className={styles.error}>Could not load the participant tokens.</p>
            )}
          </section>
          <section className={styles.card} aria-labelledby="features-title">
            <h2 id="features-title">Feature controls</h2>
            <p className={styles.description}>Manage participant access to features.</p>
            {features.map(({ feature, setting }) => (
              <div className={styles.feature} key={feature.key}>
                <FeatureToggleControl
                  feature={feature}
                  initialEnabled={setting?.enabled ?? null}
                />
                {feature.path && (
                  <Link className={styles.featureLink} href={feature.path}>
                    Open {feature.label.toLowerCase()}
                  </Link>
                )}
              </div>
            ))}
          </section>
          <section className={`${styles.card} ${styles.liveViewer}`} aria-labelledby="live-viewer-title">
            <h2 id="live-viewer-title">Live Viewer</h2>
            <p className={styles.description}>Open a participant's live game.</p>
            <AdminLiveViewerForm />
          </section>
        </div>
      </main>
    </div>
  );
}
