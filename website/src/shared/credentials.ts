import { parseToken } from "./token";

// ID is "admin" (any case) or a participant number.
export function buildToken(id: string, password: string): string | null {
  const trimmedId = id.trim();
  const trimmedPassword = password.trim();
  if (!trimmedId || !trimmedPassword) return null;

  const token =
    trimmedId.toLowerCase() === "admin"
      ? `ADMIN-${trimmedPassword}`
      : `PARTICIPANT-${trimmedId}-${trimmedPassword}`;
  return parseToken(token) ? token : null;
}
