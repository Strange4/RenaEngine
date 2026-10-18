"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ParsedToken } from "@/shared/token";

export type AuthState =
  | { status: "loading"; user: null }
  | { status: "unauthenticated"; user: null }
  | { status: "authenticated"; user: ParsedToken };

export type AuthContextValue = AuthState & {
  // Re-checks the session cookie with the server.
  refresh: () => Promise<void>;
  // Drops the local user state without calling the server.
  clear: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchUser(): Promise<ParsedToken | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin",
  }).catch(() => null);
  if (!response?.ok) return null;
  return (await response.json().catch(() => null)) as ParsedToken | null;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });

  const refresh = useCallback(async () => {
    const user = await fetchUser();
    setState(
      user
        ? { status: "authenticated", user }
        : { status: "unauthenticated", user: null },
    );
  }, []);

  const clear = useCallback(() => {
    setState({ status: "unauthenticated", user: null });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchUser().then((user) => {
      if (cancelled) return;
      setState(
        user
          ? { status: "authenticated", user }
          : { status: "unauthenticated", user: null },
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ ...state, refresh, clear }),
    [state, refresh, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
