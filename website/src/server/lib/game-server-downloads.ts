import type { SdkLanguage } from "@/shared/sdk-languages";

function downloadUrl(language: SdkLanguage): string | null {
  const baseUrl = process.env.GAME_SERVER_URL;
  if (!baseUrl) return null;

  try {
    return new URL(
      `downloads/${encodeURIComponent(language)}`,
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    ).toString();
  } catch {
    return null;
  }
}

// Returns the game-server response so the website route can stream the archive
// without buffering it in application memory. Null means the server could not
// be configured or reached.
export async function fetchSdkArchive(
  language: SdkLanguage,
): Promise<Response | null> {
  const url = downloadUrl(language);
  if (!url) return null;

  return fetch(url, { cache: "no-store" }).catch(() => null);
}
