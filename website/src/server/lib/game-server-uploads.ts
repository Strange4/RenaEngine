function uploadUrl(participantId: number): string | null {
  const baseUrl = process.env.GAME_SERVER_URL;
  if (!baseUrl) {
    console.error("GAME_SERVER_URL is not set; code uploads cannot be forwarded");
    return null;
  }

  try {
    return new URL(
      `upload/${encodeURIComponent(`PLAYER-${participantId}`)}`,
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    ).toString();
  } catch {
    console.error("GAME_SERVER_URL is not a valid URL");
    return null;
  }
}

export async function uploadSubmission(
  participantId: number,
  file: File,
): Promise<Response | null> {
  const url = uploadUrl(participantId);
  if (!url) return null;

  const formData = new FormData();
  formData.append("file", file, file.name);

  return fetch(url, {
    method: "POST",
    body: formData,
    cache: "no-store",
  }).catch(() => null);
}
