import { parseToken } from "./token";

// Builds a login token from an ID and password, or returns null if either is invalid.
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
