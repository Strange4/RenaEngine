/**
 * @jest-environment node
 */
import { POST } from "./login";

function postLogin(body: string) {
  return POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
}

describe("POST /api/auth/login", () => {
  it("logs in an admin and sets the session cookie", async () => {
    const response = await postLogin(
      JSON.stringify({ id: "admin", password: "secret" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ role: "admin", id: "admin" });
    expect(response.cookies.get("session_token")?.value).toBe("ADMIN-secret");
  });

  it("logs in a participant and sets the session cookie", async () => {
    const response = await postLogin(
      JSON.stringify({ id: "42", password: "secret" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ role: "participant", id: "42" });
    expect(response.cookies.get("session_token")?.value).toBe(
      "PARTICIPANT-42-secret",
    );
  });

  it("trims whitespace from ID and password before building the token", async () => {
    const response = await postLogin(
      JSON.stringify({ id: " 42 ", password: " secret " }),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("session_token")?.value).toBe(
      "PARTICIPANT-42-secret",
    );
  });

  it.each([
    JSON.stringify({ id: "bob", password: "secret" }),
    JSON.stringify({ id: "42", password: "" }),
    JSON.stringify({ id: "42", password: "two words" }),
    JSON.stringify({ id: "42" }),
    JSON.stringify({ password: "secret" }),
    JSON.stringify({ id: 42, password: "secret" }),
    "not json",
  ])("rejects invalid payload %s with 400", async (body) => {
    const response = await postLogin(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Enter ADMIN or a participant number, and a password",
    });
    expect(response.cookies.get("session_token")).toBeUndefined();
  });
});
