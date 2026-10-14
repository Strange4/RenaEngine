import { parseToken } from "./token";

describe("parseToken", () => {
  it("recognizes an admin token", () => {
    expect(parseToken("ADMIN-secret")).toEqual({ role: "admin" });
  });

  it("recognizes a participant token", () => {
    expect(parseToken("PARTICIPANT-42-secret")).toEqual({
      role: "participant",
      participantId: 42,
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseToken("  PARTICIPANT-7-secret  ")).toEqual({
      role: "participant",
      participantId: 7,
    });
  });

  it.each([
    "",
    "ADMIN-",
    "PARTICIPANT-secret",
    "PARTICIPANT-not-a-number-secret",
    "unknown-token",
  ])("rejects invalid token %p", (token) => {
    expect(parseToken(token)).toBeNull();
  });
});
