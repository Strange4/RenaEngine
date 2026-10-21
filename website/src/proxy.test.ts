/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { SESSION_COOKIE } from "@/server/lib/session";
import { config, proxy } from "./proxy";

function requestFor(path: string, token?: string) {
  const request = new NextRequest(`http://localhost${path}`);
  if (token) request.cookies.set(SESSION_COOKIE, token);
  return request;
}

function redirectLocation(response: Response) {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

describe("proxy", () => {
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
    const response = proxy(requestFor("/admin/settings", "PARTICIPANT-42-secret"));

    expect(redirectLocation(response)).toBe("/access-denied");
  });

  it("sends an admin who opens a participant page to /admin", () => {
    const response = proxy(requestFor("/participant", "ADMIN-secret"));

    expect(redirectLocation(response)).toBe("/admin");
  });

  it.each([
    ["/admin", "ADMIN-secret"],
    ["/admin/settings", "ADMIN-secret"],
    ["/participant", "PARTICIPANT-42-secret"],
  ])("lets %s through for token %s", (path, token) => {
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
