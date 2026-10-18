"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buildToken } from "@/shared/credentials";
import { homePathFor, isAdmin, parseToken } from "@/shared/token";
import { useAuth } from "./AuthProvider";

export default function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    await refresh();
    router.replace(homePathFor(parsed));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="user-id">ID</label>
      <input
        id="user-id"
        type="text"
        autoComplete="username"
        value={id}
        onChange={(e) => {
          setId(e.target.value);
          setError(null);
        }}
      />
      <label htmlFor="user-password">Password</label>
      <input
        id="user-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
        }}
      />
      {roleLabel && <p className="hint">Detected role: {roleLabel}</p>}
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
