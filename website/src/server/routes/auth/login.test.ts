/**
 * @jest-environment node
 */
import { POST } from "./login";
import { hashToken } from "@/server/lib/token-hash";

const mockDbPrepare = jest.fn();
jest.mock("@/server/lib/db", () => ({
  getDb: () => ({
    prepare: mockDbPrepare,
  }),
}));

function postLogin(body: string) {
  return POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
}

function withDbUser(token: string | null, role: string | null) {
  mockDbPrepare.mockReturnValue({
    get: (hash: string) => {
      if (!token) return undefined;
      return hash === hashToken(token) ? { id: 1, role } : undefined;
    },
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => mockDbPrepare.mockReset());

  it("logs in with a valid admin token", async () => {
    withDbUser("ADMIN-dev", "admin");
    const response = await postLogin(JSON.stringify({ token: "ADMIN-dev" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ role: "admin", id: 1 });
    expect(response.cookies.get("session_token")?.value).toBe("ADMIN-dev");
  });

  it("logs in with a valid participant token", async () => {
    withDbUser("PARTICIPANT-42-dev", "participant");
    const response = await postLogin(
      JSON.stringify({ token: "PARTICIPANT-42-dev" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ role: "participant", id: 1 });
    expect(response.cookies.get("session_token")?.value).toBe(
      "PARTICIPANT-42-dev",
    );
  });

  it("trims whitespace from token before validating", async () => {
    withDbUser("ADMIN-dev", "admin");
    const response = await postLogin(JSON.stringify({ token: "  ADMIN-dev  " }));

    expect(response.status).toBe(200);
    expect(response.cookies.get("session_token")?.value).toBe("ADMIN-dev");
  });

  it("returns 400 when token is missing", async () => {
    const response = await postLogin(JSON.stringify({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Token required" });
    expect(response.cookies.get("session_token")).toBeUndefined();
  });

  it("returns 400 when token is empty", async () => {
    const response = await postLogin(JSON.stringify({ token: "" }));

    expect(response.status).toBe(400);
    expect(response.cookies.get("session_token")).toBeUndefined();
  });

  it("returns 400 when token format is invalid", async () => {
    const response = await postLogin(JSON.stringify({ token: "invalid" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid token format",
    });
    expect(response.cookies.get("session_token")).toBeUndefined();
  });

  it("returns 401 when token is not found in DB", async () => {
    withDbUser(null, null);
    const response = await postLogin(JSON.stringify({ token: "ADMIN-wrong" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Token not found" });
    expect(response.cookies.get("session_token")).toBeUndefined();
  });

  it("rejects non-JSON payload with 400", async () => {
    const response = await postLogin("not json");

    expect(response.status).toBe(400);
    expect(response.cookies.get("session_token")).toBeUndefined();
  });
});

