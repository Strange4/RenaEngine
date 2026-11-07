"use client";

import { useRouter } from "next/navigation";
import styles from "./access-denied.module.css";

// Shows a friendly 403 message when the user cannot access a page.
// Offers a way back to the previous page.
export default function AccessDeniedPage() {
  const router = useRouter();

  // Sends the user back only when the previous page is on this site.
  // Otherwise, sends the user to the home page instead.
  function returnToPreviousPage() {
    const previousPage = document.referrer
      ? new URL(document.referrer)
      : null;

    if (previousPage?.origin === window.location.origin) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="access-denied-title">
        <div className={styles.text}>
          <p className={styles.code}>403</p>
          <h1 className={styles.title} id="access-denied-title">
            Access Denied
          </h1>
          <p className={styles.message}>
            You&rsquo;re not permitted to view this resource. Sorry!
          </p>
          <button className={styles.back} type="button" onClick={returnToPreviousPage}>
            Go back
          </button>
        </div>
        <img className={styles.art} src="/images/access-denied-art.png" alt="" />
      </section>
    </main>
  );
}
