export type FeatureDefinition = {
  key: string;
  label: string;
  path: string;
};

export const TEST_FEATURE = {
  key: "test-feature",
  label: "Test feature",
  path: "/test-feature",
} as const satisfies FeatureDefinition;

export const FEATURES = [TEST_FEATURE] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];

export function isFeatureKey(value: string): value is FeatureKey {
  return FEATURES.some((feature) => feature.key === value);
}
