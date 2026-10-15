import { buildToken } from "./credentials";

describe("buildToken", () => {
  it("builds an admin token from the admin ID", () => {
    expect(buildToken("admin", "secret")).toBe("ADMIN-secret");
  });

  it("accepts the admin ID in any case", () => {
    expect(buildToken("ADMIN", "secret")).toBe("ADMIN-secret");
  });

  it("builds a participant token from a participant number", () => {
    expect(buildToken("42", "secret")).toBe("PARTICIPANT-42-secret");
  });

  it("trims whitespace from both fields", () => {
    expect(buildToken("  42 ", " secret ")).toBe("PARTICIPANT-42-secret");
  });

  it.each([
    ["", "secret"],
    ["42", ""],
    ["   ", "secret"],
    ["42", "   "],
    ["abc", "secret"],
    ["42", "two words"],
  ])("returns null for ID %p and password %p", (id, password) => {
    expect(buildToken(id, password)).toBeNull();
  });
});
