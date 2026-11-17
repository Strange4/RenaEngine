function uploadUrl(participantId: number): string | null {
  const baseUrl = process.env.GAME_SERVER_URL;
  if (!baseUrl) return null;

  try {
    return new URL(
      `upload/${encodeURIComponent(`PLAYER-${participantId}`)}`,
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    ).toString();
  } catch {
    return null;
  }
}

export async function uploadSubmission(
  participantId: number,
  file: File,
): Promise<Response | null> {
  const url = uploadUrl(participantId);
  const serviceToken = process.env.ADMIN_TOKEN;
  if (!url || !serviceToken) return null;

  const formData = new FormData();
  formData.append("file", file, file.name);

  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceToken}` },
    body: formData,
    cache: "no-store",
  }).catch(() => null);
}
