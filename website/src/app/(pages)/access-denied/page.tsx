"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

// Shows a friendly 403 message when the user cannot access a page.
// Offers a way back or a link to the home page.
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
    <main className="access-denied-page">
      <section className="access-denied-card" aria-labelledby="access-denied-title">
        <div className="access-denied-icon" aria-hidden="true">
          !
        </div>
        <p className="access-denied-code">403 · Forbidden</p>
        <h1 id="access-denied-title">Access Denied</h1>
        <p className="access-denied-message">
          You don’t have permission to view this page. You can return to where
          you were or head back to your home page.
        </p>
        <button className="access-denied-back" type="button" onClick={returnToPreviousPage}>
          Go back
        </button>
        <Link className="access-denied-home" href="/">
          Go to your home page
        </Link>
      </section>
    </main>
  );
}
