export type Role = "admin" | "participant";

export type ParsedToken =
  | { role: "admin" }
  | { role: "participant"; participantId: number };

// ADMIN-{password} or PARTICIPANT-{number}-{password}
const ADMIN_PATTERN = /^ADMIN-\S+$/;
const PARTICIPANT_PATTERN = /^PARTICIPANT-(\d+)-\S+$/;

export function parseToken(raw: string): ParsedToken | null {
  const token = raw.trim();
  if (ADMIN_PATTERN.test(token)) {
    return { role: "admin" };
  }
  const match = PARTICIPANT_PATTERN.exec(token);
  if (match) {
    return { role: "participant", participantId: Number(match[1]) };
  }
  return null;
}
