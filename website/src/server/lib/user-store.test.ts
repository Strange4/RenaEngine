/**
 * @jest-environment node
 */
import Database from "better-sqlite3";
import { migrate } from "./db";
import { createParticipant, hashToken, listParticipantIds } from "./user-store";

let db: Database.Database;

// Lets the shared-connection default use the in-memory test database.
jest.mock("./db", () => ({
  ...jest.requireActual("./db"),
  getDb: () => db,
}));

beforeEach(() => {
  db = new Database(":memory:");
  migrate(db);
});

afterEach(() => db.close());

function storedHashes(): string[] {
  return (
    db.prepare("SELECT token_hash FROM users").all() as { token_hash: string }[]
  ).map((row) => row.token_hash);
}

describe("hashToken", () => {
  it("returns a stable SHA-256 hex digest", () => {
    expect(hashToken("ADMIN-secret")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("ADMIN-secret")).toBe(hashToken("ADMIN-secret"));
    expect(hashToken("ADMIN-secret")).not.toBe(hashToken("ADMIN-other"));
  });
});

describe("createParticipant", () => {
  it("returns a token that embeds the new participant ID", () => {
    const { participantId, token } = createParticipant(db);

    expect(participantId).toBe(1);
    expect(token).toMatch(/^PARTICIPANT-1-[A-Za-z0-9_-]{32}$/);
  });

  it("stores only the hash of the token", () => {
    const { token } = createParticipant(db);

    expect(storedHashes()).toEqual([hashToken(token)]);
  });

  it("generates a different secret for every participant", () => {
    const tokens = Array.from({ length: 20 }, () => createParticipant(db).token);
    const secrets = tokens.map((token) => token.split("-").slice(2).join("-"));

    expect(new Set(secrets).size).toBe(tokens.length);
  });
});

describe("listParticipantIds", () => {
  it("lists participants in order and leaves out admins", () => {
    db.prepare("INSERT INTO users (token_hash, role) VALUES ('admin-hash', 'admin')").run();
    const first = createParticipant(db).participantId;
    const second = createParticipant(db).participantId;

    expect(listParticipantIds(db)).toEqual([first, second]);
  });

  it("returns an empty list before anyone is registered", () => {
    expect(listParticipantIds(db)).toEqual([]);
  });
});

describe("default connection", () => {
  it("uses the shared database when none is passed", () => {
    const { participantId } = createParticipant();

    expect(listParticipantIds()).toEqual([participantId]);
  });
});
