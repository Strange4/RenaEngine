"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import LoadingScreen from "./LoadingScreen";
import styles from "../(pages)/participant/participant.module.css";

export default function LogoutButton() {
  const router = useRouter();
  const { clear } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    clear();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <button className={styles.logout} onClick={logout} disabled={loggingOut}>
        Log Out
      </button>
      {loggingOut && <LoadingScreen message="Signing you out…" />}
    </>
  );
}
