import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/app/components/LogoutButton";
import SdkDownloadPanel from "@/app/components/SdkDownloadPanel";
import { getFeatureAccess } from "@/server/lib/feature-access";
import { getSession } from "@/server/lib/session";
import { isFeatureAllowed, SDK_DOWNLOADS_FEATURE } from "@/shared/features";
import { isAdmin } from "@/shared/token";
import styles from "./participant.module.css";

export default async function ParticipantPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isAdmin(session)) redirect("/admin");
  const sdkAccess = await getFeatureAccess(SDK_DOWNLOADS_FEATURE.key);
  const teamName = `Participant #${session.participantId}`;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.team}>{teamName}</span>
        <LogoutButton />
      </header>

      <div className={styles.content}>
        <section className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>Welcome back, {teamName}</h1>
          <p className={styles.welcomeSub}>
            {/* GENERATED TEXT FOR PARTICIPANT WELCOME MESSAGE HERE */}
          </p>
        </section>

        <div className={styles.grid}>
          <section className={styles.card} aria-labelledby="sdk-title">
            <h2 className={styles.cardTitle} id="sdk-title">
              Starter SDK
            </h2>
            {isFeatureAllowed(sdkAccess) ? (
              <SdkDownloadPanel />
            ) : (
              <p className={styles.unavailable}>
                Starter SDK downloads are currently unavailable.
              </p>
            )}
          </section>

          <section className={styles.card} aria-labelledby="features-title">
            <h2 className={styles.cardTitle} id="features-title">
              Features
            </h2>
            <p className={styles.cardSub}>
              {/* TODO - CHANGE THIS ONCE FEATURES ARE IMPLEMENTED */}
              Try out the temporary test feature.
            </p>
            <Link className={styles.featureLink} href="/test-feature">
              Open test feature
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
