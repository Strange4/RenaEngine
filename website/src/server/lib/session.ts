import { cookies } from "next/headers";
import { parseToken, type ParsedToken } from "@/shared/token";

export const SESSION_COOKIE = "rena_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

export type Session = ParsedToken & { token: string };

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const parsed = parseToken(token);
  return parsed ? { ...parsed, token } : null;
}
