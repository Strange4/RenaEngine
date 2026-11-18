/**
 * @jest-environment node
 */
// AI contribution: 50% or more AI-generated - used for proper test coverage & mocking
import { GET } from "./me";
import { hashToken } from "@/server/lib/token-hash";

const mockGet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: async () => ({ get: mockGet }),
}));

const mockDbPrepare = jest.fn();
jest.mock("@/server/lib/db", () => ({
  getDb: () => ({
    prepare: mockDbPrepare,
  }),
}));

function withCookie(value: string | undefined) {
  mockGet.mockReturnValue(value === undefined ? undefined : { value });
}

function withDbUser(token: string | null, role: string | null) {
  mockDbPrepare.mockReturnValue({
    get: (hash: string) => {
      if (!token) return undefined;
      return hash === hashToken(token) ? { role } : undefined;
    },
  });
}

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockDbPrepare.mockReset();
  });

  it("returns admin metadata for a valid admin session", async () => {
    withCookie("ADMIN-secret");
    withDbUser("ADMIN-secret", "admin");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authenticated: true,
      role: "admin",
    });
  });

  it("returns participant metadata for a valid participant session", async () => {
    withCookie("PARTICIPANT-42-secret");
    withDbUser("PARTICIPANT-42-secret", "participant");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authenticated: true,
      role: "participant",
    });
  });

  it("does not expose the raw token", async () => {
    withCookie("ADMIN-secret");
    withDbUser("ADMIN-secret", "admin");
    const body = await (await GET()).json();

    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("returns 401 when the cookie is missing", async () => {
    withCookie(undefined);
    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Not authenticated" });
  });

  it("returns 401 when token not found in DB", async () => {
    withCookie("ADMIN-invalid");
    withDbUser(null, null);
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it.each(["garbage", "ADMIN-", "PARTICIPANT-abc-secret", "PARTICIPANT-42"])(
    "returns 401 for the invalid token format %p",
    async (value) => {
      withCookie(value);
      const response = await GET();

      expect(response.status).toBe(401);
    },
  );
});

