"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buildToken } from "@/shared/credentials";
import { homePathFor, isAdmin, parseToken } from "@/shared/token";
import { useAuth } from "./AuthProvider";
import LoadingScreen from "./LoadingScreen";
import styles from "../(pages)/login/login.module.css";

export default function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const token = buildToken(id, password);
  const parsed = token ? parseToken(token) : null;
  const roleLabel = parsed
    ? isAdmin(parsed)
      ? "Admin"
      : `Participant #${parsed.participantId}`
    : null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token || !parsed) {
      setError("Enter ADMIN or a participant number, and a password");
      return;
    }
    setError(null);
    setLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password }),
    }).catch(() => null);
    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setError(body?.error ?? "Could not log in");
      setLoading(false);
      return;
    }
    setRedirecting(true);
    await refresh();
    router.replace(homePathFor(parsed));
    router.refresh();
  }

  if (redirecting) return <LoadingScreen message="Signing you in…" />;

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.label} htmlFor="user-id">ID</label>
      <input
        className={styles.input}
        id="user-id"
        type="text"
        autoComplete="username"
        value={id}
        onChange={(e) => {
          setId(e.target.value);
          setError(null);
        }}
      />
      <label className={styles.label} htmlFor="user-password">Password</label>
      <input
        className={styles.input}
        id="user-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
        }}
      />
      {roleLabel && <p className={styles.hint}>Detected role: {roleLabel}</p>}
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
