import type { FeatureKey } from "@/shared/features";

export type FeatureSetting = {
  enabled: boolean;
};

function settingsUrl(featureKey: FeatureKey): string | null {
  const baseUrl = process.env.GAME_SERVER_URL;
  if (!baseUrl) return null;

  try {
    return new URL(
      `settings/features/${encodeURIComponent(featureKey)}`,
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    ).toString();
  } catch {
    return null;
  }
}

function parseSetting(value: unknown): FeatureSetting | null {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as { enabled?: unknown }).enabled !== "boolean"
  ) {
    return null;
  }

  return { enabled: (value as FeatureSetting).enabled };
}

export async function getFeatureSetting(
  featureKey: FeatureKey,
): Promise<FeatureSetting | null> {
  const url = settingsUrl(featureKey);
  if (!url) return null;

  const response = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;

  return parseSetting(await response.json().catch(() => null));
}

export async function updateFeatureSetting(
  featureKey: FeatureKey,
  enabled: boolean,
): Promise<FeatureSetting | null> {
  const url = settingsUrl(featureKey);
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
