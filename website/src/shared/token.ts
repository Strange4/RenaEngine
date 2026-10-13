export enum Role {
  Admin = "admin",
  Participant = "participant",
}

export type ParsedToken =
  | { role: Role.Admin }
  | { role: Role.Participant; participantId: number };

// ADMIN-{password} or PARTICIPANT-{number}-{password}
const ADMIN_PATTERN = /^ADMIN-\S+$/;
const PARTICIPANT_PATTERN = /^PARTICIPANT-(\d+)-\S+$/;

export function parseToken(raw: string): ParsedToken | null {
  const token = raw.trim();
  if (ADMIN_PATTERN.test(token)) {
    return { role: Role.Admin };
  }
  const match = PARTICIPANT_PATTERN.exec(token);
  if (match) {
    return { role: Role.Participant, participantId: Number(match[1]) };
  }
  return null;
}

// Returns true when the parsed token belongs to an admin.
export function isAdmin(parsed: ParsedToken): parsed is { role: Role.Admin } {
  return parsed.role === Role.Admin;
}

// Returns the page a logged-in user is sent to.
export function homePathFor(parsed: ParsedToken): string {
  return isAdmin(parsed) ? "/admin" : "/participant";
}
