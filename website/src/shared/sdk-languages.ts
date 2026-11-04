export const SDK_LANGUAGES = [
  {
    key: "typescript",
    label: "TypeScript",
    fileName: "typescript.zip",
    description: "Node.js starter project with generated game types.",
  },
  {
    key: "csharp",
    label: "C#",
    fileName: "csharp.zip",
    description: ".NET starter project for building a game participant.",
  },
  {
    key: "python",
    label: "Python",
    fileName: "python.zip",
    description: "Python starter project with the game client scaffolding.",
  },
] as const;

export type SdkLanguage = (typeof SDK_LANGUAGES)[number]["key"];
export type SdkLanguageDefinition = (typeof SDK_LANGUAGES)[number];

export function isSdkLanguage(value: string): value is SdkLanguage {
  return SDK_LANGUAGES.some((language) => language.key === value);
}

export function getSdkLanguage(
  value: SdkLanguage,
): SdkLanguageDefinition {
  return SDK_LANGUAGES.find((language) => language.key === value)!;
}
