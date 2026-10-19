"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  // Incremented by every refresh/clear/unmount so older responses are ignored.
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    const user = await fetchUser();
    if (id !== requestId.current) return;
    setState(
      user
        ? { status: "authenticated", user }
        : { status: "unauthenticated", user: null },
    );
  }, []);

  const clear = useCallback(() => {
    requestId.current++;
    setState({ status: "unauthenticated", user: null });
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current++;
    };
  }, [refresh]);

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
