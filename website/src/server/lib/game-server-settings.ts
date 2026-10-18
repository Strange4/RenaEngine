export type TestFeatureSetting = {
  enabled: boolean;
};

function settingsUrl(): string | null {
  const baseUrl = process.env.GAME_SERVER_URL;
  if (!baseUrl) return null;

  try {
    return new URL(
      "settings/features/test-feature",
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    ).toString();
  } catch {
    return null;
  }
}

function parseSetting(value: unknown): TestFeatureSetting | null {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as { enabled?: unknown }).enabled !== "boolean"
  ) {
    return null;
  }

  return { enabled: (value as TestFeatureSetting).enabled };
}

export async function getTestFeatureSetting(): Promise<TestFeatureSetting | null> {
  const url = settingsUrl();
  if (!url) return null;

  const response = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;

  return parseSetting(await response.json().catch(() => null));
}

export async function updateTestFeatureSetting(
  enabled: boolean,
): Promise<TestFeatureSetting | null> {
  const url = settingsUrl();
  const adminToken = process.env.ADMIN_TOKEN;
  if (!url || !adminToken) return null;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;

  return parseSetting(await response.json().catch(() => null));
}
