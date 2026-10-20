/**
 * @jest-environment node
 */
import { POST } from "./logout";

describe("POST /api/auth/logout", () => {
  it("returns ok", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("expires the session_token cookie", async () => {
    const response = await POST();

    expect(response.cookies.get("session_token")?.value).toBe("");
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/session_token=;/);
    expect(setCookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
    expect(setCookie).toMatch(/Path=\//i);
  });
});
