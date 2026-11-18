// AI contribution: Below 50% AI-generated
import { createHash, randomBytes } from "node:crypto";
import type Database from "better-sqlite3";
import { getDb } from "./db";
import { Role } from "@/shared/token";

// 24 random bytes = 192 bits of entropy, encoded as a 32-character base64url string.
const SECRET_BYTES = 24;

export type CreatedParticipant = { participantId: number; token: string };

// Tokens are long and random, so a fast hash is enough: there is nothing to
// brute-force, and a deterministic hash lets users be looked up by index.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateSecret(): string {
  return randomBytes(SECRET_BYTES).toString("base64url");
}

// Creates a participant and returns its token. The plaintext is never stored,
// so this is the only time it can be shown.
export function createParticipant(
  db: Database.Database = getDb(),
): CreatedParticipant {
  return db.transaction(() => {
    // The token embeds the participant ID, which only exists after the insert,
    // so the row starts with a unique placeholder hash and is updated in place.
    const { lastInsertRowid } = db
      .prepare("INSERT INTO users (token_hash, role) VALUES (?, ?)")
      .run(`pending-${generateSecret()}`, Role.Participant);
    const participantId = Number(lastInsertRowid);
    const token = `PARTICIPANT-${participantId}-${generateSecret()}`;
    db.prepare("UPDATE users SET token_hash = ? WHERE id = ?").run(
      hashToken(token),
      participantId,
    );
    return { participantId, token };
  })();
}

// Returns true when the token is registered to this participant. A deleted
// participant no longer has a row, so their token stops matching.
export function isRegisteredParticipant(
  participantId: number,
  token: string,
  db: Database.Database = getDb(),
): boolean {
  const row = db
    .prepare("SELECT 1 FROM users WHERE id = ? AND role = ? AND token_hash = ?")
    .get(participantId, Role.Participant, hashToken(token));
  return row !== undefined;
}

// Returns participant IDs in ascending order.
export function listParticipantIds(db: Database.Database = getDb()): number[] {
  const rows = db
    .prepare("SELECT id FROM users WHERE role = ? ORDER BY id")
    .all(Role.Participant) as { id: number }[];
  return rows.map((row) => row.id);
}
