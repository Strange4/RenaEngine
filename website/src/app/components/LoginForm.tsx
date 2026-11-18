"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { parseToken, homePathFor, isAdmin } from "@/shared/token";
import { useAuth } from "./AuthProvider";
import LoadingScreen from "./LoadingScreen";
import styles from "../(pages)/login/login.module.css";

export default function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const parsed = parseToken(token);
  const roleLabel = parsed
    ? isAdmin(parsed)
      ? "Admin"
      : `Participant #${parsed.participantId}`
    : null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token.trim()) {
      setError("Enter your token");
      return;
    }
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    }).catch(() => null);

    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setError(body?.error ?? "Could not log in");
      setLoading(false);
      return;
    }

    setRedirecting(true);
    await refresh();
    const redirectParsed = parseToken(token.trim());
    if (redirectParsed) {
      router.replace(homePathFor(redirectParsed));
      router.refresh();
    }
  }

  if (redirecting) return <LoadingScreen message="Signing you in…" />;

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.label} htmlFor="token">Token</label>
      <input
        className={styles.input}
        id="token"
        type="text"
        autoComplete="off"
        placeholder="e.g., ADMIN-dev"
        value={token}
        onChange={(e) => {
          setToken(e.target.value);
          setError(null);
        }}
      />
      {roleLabel && <p className={styles.hint}>Role: {roleLabel}</p>}
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
