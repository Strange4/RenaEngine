import {
  FEATURES,
  isFeatureKey,
  SDK_DOWNLOADS_FEATURE,
} from "./features";

describe("features", () => {
  it("registers SDK downloads for the admin feature controls", () => {
    expect(FEATURES).toContain(SDK_DOWNLOADS_FEATURE);
    expect(isFeatureKey("sdk-downloads")).toBe(true);
  });

  it("does not give the admin a participant-only preview link", () => {
    expect(SDK_DOWNLOADS_FEATURE.path).toBeUndefined();
  });
});
