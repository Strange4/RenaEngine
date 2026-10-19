"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function LogoutButton() {
  const router = useRouter();
  const { clear } = useAuth();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clear();
    router.replace("/login");
    router.refresh();
  }

  return <button onClick={logout}>Log Out</button>;
}
