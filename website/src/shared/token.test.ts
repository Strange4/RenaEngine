import { homePathFor, isAdmin, parseToken, Role } from "./token";

describe("isAdmin", () => {
  it("returns true for an admin token", () => {
    expect(isAdmin({ role: Role.Admin })).toBe(true);
  });

  it("returns false for a participant token", () => {
    expect(isAdmin({ role: Role.Participant, participantId: 42 })).toBe(false);
  });
});

describe("homePathFor", () => {
  it("sends an admin to the admin page", () => {
    expect(homePathFor({ role: Role.Admin })).toBe("/admin");
  });

  it("sends a participant to the participant page", () => {
    expect(homePathFor({ role: Role.Participant, participantId: 42 })).toBe(
      "/participant",
    );
  });
});

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
