/**
 * @jest-environment node
 */
// AI contribution: 50% or more AI-generated - used for proper test coverage & mocking of the proxy middleware
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { SESSION_COOKIE } from "@/server/lib/session";
import { hashToken } from "@/server/lib/token-hash";
import { config, proxy } from "./proxy";

const mockDbPrepare = jest.fn();
jest.mock("@/server/lib/db", () => ({
  getDb: () => ({
    prepare: mockDbPrepare,
  }),
}));

function requestFor(path: string, token?: string) {
  const request = new NextRequest(`http://localhost${path}`);
  if (token) request.cookies.set(SESSION_COOKIE, token);
  return request;
}

function redirectLocation(response: Response) {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

function withDbUser(token: string | null, role: string | null) {
  mockDbPrepare.mockReturnValue({
    get: (hash: string) => {
      if (!token) return undefined;
      return hash === hashToken(token) ? { role } : undefined;
    },
  });
}

describe("proxy", () => {
  beforeEach(() => mockDbPrepare.mockReset());

  it.each(["/admin", "/participant", "/admin/settings"])(
    "redirects a visitor without a session from %s to /login",
    (path) => {
      expect(redirectLocation(proxy(requestFor(path)))).toBe("/login");
    },
  );

  it("redirects a visitor with a malformed session cookie to /login", () => {
    expect(redirectLocation(proxy(requestFor("/admin", "garbage")))).toBe(
      "/login",
    );
  });

  it("sends a participant who opens an admin page to /access-denied", () => {
    withDbUser("PARTICIPANT-42-secret", "participant");
    const response = proxy(requestFor("/admin/settings", "PARTICIPANT-42-secret"));

    expect(redirectLocation(response)).toBe("/access-denied");
  });

  it("sends an admin who opens a participant page to /admin", () => {
    withDbUser("ADMIN-secret", "admin");
    const response = proxy(requestFor("/participant", "ADMIN-secret"));

    expect(redirectLocation(response)).toBe("/admin");
  });

  it.each([
    ["/admin", "ADMIN-secret"],
    ["/admin/settings", "ADMIN-secret"],
    ["/participant", "PARTICIPANT-42-secret"],
  ])("lets %s through for token %s", (path, token) => {
    const isAdmin = token.startsWith("ADMIN");
    withDbUser(token, isAdmin ? "admin" : "participant");
    const response = proxy(requestFor(path, token));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("proxy matcher", () => {
  it.each([
    "/admin",
    "/admin/settings",
    "/participant",
    "/participant/code",
  ])(
    "runs on %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    },
  );

  it.each([
    "/",
    "/login",
    "/access-denied",
    "/api/auth/me",
    "/administrator",
    "/test-feature",
  ])(
    "does not run on %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    },
  );
});
