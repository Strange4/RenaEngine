import { getFeatureAccess } from "./feature-access";

const mockGetSession = jest.fn();
const mockGetFeatureSetting = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

jest.mock("@/server/lib/game-server-settings", () => ({
  getFeatureSetting: (featureKey: string) => mockGetFeatureSetting(featureKey),
}));

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetFeatureSetting.mockReset();
});

describe("getFeatureAccess", () => {
  it("requires a session", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(getFeatureAccess("test-feature")).resolves.toEqual({
      status: "unauthenticated",
    });
  });

  it("lets admins bypass the setting", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });

    await expect(getFeatureAccess("test-feature")).resolves.toEqual({
      status: "allowed",
      admin: true,
    });
    expect(mockGetFeatureSetting).not.toHaveBeenCalled();
  });

  it("allows participants when the setting is enabled", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockGetFeatureSetting.mockResolvedValue({ enabled: true });

    await expect(getFeatureAccess("test-feature")).resolves.toEqual({
      status: "allowed",
      admin: false,
    });
    expect(mockGetFeatureSetting).toHaveBeenCalledWith("test-feature");
  });

  it("fails closed when the setting is disabled or unavailable", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockGetFeatureSetting.mockResolvedValue(null);

    await expect(getFeatureAccess("test-feature")).resolves.toEqual({
      status: "disabled",
    });
  });
});
