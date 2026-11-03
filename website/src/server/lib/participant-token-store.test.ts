/**
 * @jest-environment node
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { listParticipantTokens } from "./participant-token-store";

const originalStorePath = process.env.TOKEN_STORE_PATH;
const originalCwd = process.cwd();
let tempDir: string;

const validToken = {
  participantId: 3,
  token: "PARTICIPANT-3-secret",
  active: true,
  lastSubmissionAt: "2026-10-20T14:30:00Z",
};

async function writeStore(contents: string) {
  const file = path.join(tempDir, "tokens.json");
  await writeFile(file, contents);
  process.env.TOKEN_STORE_PATH = file;
}

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "token-store-"));
});

afterEach(async () => {
  process.chdir(originalCwd);
  if (originalStorePath === undefined) delete process.env.TOKEN_STORE_PATH;
  else process.env.TOKEN_STORE_PATH = originalStorePath;
  await rm(tempDir, { recursive: true, force: true });
});

describe("listParticipantTokens", () => {
  it("reads the registered tokens from the store file", async () => {
    const tokens = [validToken, { ...validToken, participantId: 4, lastSubmissionAt: null }];
    await writeStore(JSON.stringify(tokens));

    await expect(listParticipantTokens()).resolves.toEqual(tokens);
  });

  it("defaults to data/participant-tokens.json in the working directory", async () => {
    delete process.env.TOKEN_STORE_PATH;
    process.chdir(tempDir);
    await mkdir(path.join(tempDir, "data"));
    await writeFile(
      path.join(tempDir, "data", "participant-tokens.json"),
      JSON.stringify([validToken]),
    );

    await expect(listParticipantTokens()).resolves.toEqual([validToken]);
  });

  it("returns an empty list before any participant is registered", async () => {
    process.env.TOKEN_STORE_PATH = path.join(tempDir, "missing.json");

    await expect(listParticipantTokens()).resolves.toEqual([]);
  });

  it("returns null when the store cannot be read", async () => {
    process.env.TOKEN_STORE_PATH = tempDir;

    await expect(listParticipantTokens()).resolves.toBeNull();
  });

  it.each([
    ["invalid JSON", "{not json"],
    ["a non-array body", JSON.stringify({ tokens: [] })],
    ["a non-integer participant id", JSON.stringify([{ ...validToken, participantId: 1.5 }])],
    ["a missing token string", JSON.stringify([{ ...validToken, token: undefined }])],
    ["a non-boolean status", JSON.stringify([{ ...validToken, active: "yes" }])],
    ["a non-string submission date", JSON.stringify([{ ...validToken, lastSubmissionAt: 5 }])],
    ["a null entry", JSON.stringify([null])],
  ])("returns null for %s", async (_description, contents) => {
    await writeStore(contents);

    await expect(listParticipantTokens()).resolves.toBeNull();
  });
});
