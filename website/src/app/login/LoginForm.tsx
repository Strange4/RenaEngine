"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { parseToken } from "@/lib/token";

export default function LoginForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parsed = parseToken(token);
  const roleLabel = parsed
    ? parsed.role === "admin"
      ? "Admin"
      : `Participant #${parsed.participantId}`
    : null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!parsed) {
      setError("Invalid token format");
      return;
    }
    setError(null);
    setLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setError(body?.error ?? "Could not log in");
      setLoading(false);
      return;
    }
    router.replace(parsed.role === "admin" ? "/admin" : "/participant");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="token">Token</label>
      <input
        id="token"
        type="password"
        autoComplete="off"
        value={token}
        onChange={(e) => {
          setToken(e.target.value);
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
