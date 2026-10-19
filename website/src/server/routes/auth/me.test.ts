/**
 * @jest-environment node
 */
import { GET } from "./me";

const mockGet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: async () => ({ get: mockGet }),
}));

function withCookie(value: string | undefined) {
  mockGet.mockReturnValue(value === undefined ? undefined : { value });
}

describe("GET /api/auth/me", () => {
  beforeEach(() => mockGet.mockReset());

  it("returns admin metadata for a valid admin session", async () => {
    withCookie("ADMIN-secret");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authenticated: true,
      role: "admin",
      id: "admin",
    });
  });

  it("returns participant metadata for a valid participant session", async () => {
    withCookie("PARTICIPANT-42-secret");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authenticated: true,
      role: "participant",
      id: "42",
    });
  });

  it("does not expose the raw token", async () => {
    withCookie("ADMIN-secret");
    const body = await (await GET()).json();

    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("returns 401 when the cookie is missing", async () => {
    withCookie(undefined);
    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Not authenticated" });
  });

  it.each(["garbage", "ADMIN-", "PARTICIPANT-abc-secret", "PARTICIPANT-42"])(
    "returns 401 for the invalid cookie %p",
    async (value) => {
      withCookie(value);
      const response = await GET();

      expect(response.status).toBe(401);
    },
  );
});
