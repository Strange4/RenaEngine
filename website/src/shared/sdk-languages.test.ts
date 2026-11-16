import {
  getSdkLanguage,
  isSdkLanguage,
  SDK_LANGUAGES,
} from "./sdk-languages";

describe("SDK languages", () => {
  it("registers each participant download option", () => {
    expect(SDK_LANGUAGES.map((language) => language.key)).toEqual([
      "typescript",
      "csharp",
      "python",
    ]);
  });

  it("recognizes only registered route values", () => {
    expect(isSdkLanguage("typescript")).toBe(true);
    expect(isSdkLanguage("C#")).toBe(false);
    expect(isSdkLanguage("../typescript")).toBe(false);
  });

  it("returns the download metadata for a language", () => {
    expect(getSdkLanguage("python")).toMatchObject({
      label: "Python",
      fileName: "python.zip",
    });
  });
});
