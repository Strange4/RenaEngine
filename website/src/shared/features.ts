export type FeatureDefinition = {
  key: string;
  label: string;
  path?: string;
};

export const TEST_FEATURE = {
  key: "test-feature",
  label: "Test feature",
  path: "/test-feature",
} as const satisfies FeatureDefinition;

export const SDK_DOWNLOADS_FEATURE = {
  key: "sdk-downloads",
  label: "Starter SDK downloads",
  path: undefined,
} as const satisfies FeatureDefinition;

export const FEATURES = [TEST_FEATURE, SDK_DOWNLOADS_FEATURE] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];

export function isFeatureKey(value: string): value is FeatureKey {
  return FEATURES.some((feature) => feature.key === value);
}

export enum FeatureAccessStatus {
  Unauthenticated = "unauthenticated",
  Disabled = "disabled",
  Allowed = "allowed",
}

// Returns true only when the feature may be used; unauthenticated and
// disabled both count as not allowed.
export function isFeatureAllowed(access: {
  status: FeatureAccessStatus;
}): boolean {
  return access.status === FeatureAccessStatus.Allowed;
}
