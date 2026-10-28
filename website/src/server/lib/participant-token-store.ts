import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ParticipantToken } from "@/shared/participant-tokens";

// The website owns participant registration, so tokens are kept on this server.
// A JSON file for now; swap this module out if the team picks a database.
function storePath(): string {
  return (
    process.env.TOKEN_STORE_PATH ??
    path.join(process.cwd(), "data", "participant-tokens.json")
  );
}

function parseToken(value: unknown): ParticipantToken | null {
  if (typeof value !== "object" || value === null) return null;
  const { participantId, token, active, lastSubmissionAt } = value as Record<
    string,
    unknown
  >;
  if (
    typeof participantId !== "number" ||
    !Number.isInteger(participantId) ||
    typeof token !== "string" ||
    typeof active !== "boolean" ||
    (lastSubmissionAt !== null && typeof lastSubmissionAt !== "string")
  ) {
    return null;
  }

  return { participantId, token, active, lastSubmissionAt };
}

function parseTokens(value: unknown): ParticipantToken[] | null {
  if (!Array.isArray(value)) return null;
  const tokens = value.map(parseToken);
  return tokens.every((token) => token !== null)
    ? (tokens as ParticipantToken[])
    : null;
}

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

// Returns the registered tokens, an empty list before anyone is registered,
// or null when the store cannot be read.
export async function listParticipantTokens(): Promise<
  ParticipantToken[] | null
> {
  let raw: string;
  try {
    raw = await readFile(storePath(), "utf8");
  } catch (error) {
    return isMissingFile(error) ? [] : null;
  }

  try {
    return parseTokens(JSON.parse(raw));
  } catch {
    return null;
  }
}
