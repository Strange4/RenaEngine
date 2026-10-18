/**
 * @jest-environment node
 */
import { PUT } from "./feature";

const mockGetSession = jest.fn();
const mockUpdateFeatureSetting = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

jest.mock("@/server/lib/game-server-settings", () => ({
  updateFeatureSetting: (featureKey: string, enabled: boolean) =>
    mockUpdateFeatureSetting(featureKey, enabled),
}));

function putSetting(body: unknown, featureKey = "test-feature") {
  return PUT(
    new Request(`http://localhost/api/settings/features/${featureKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    featureKey,
  );
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockUpdateFeatureSetting.mockReset();
});

describe("PUT /api/settings/features/[featureKey]", () => {
  it("rejects logged-out visitors", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await putSetting({ enabled: true });

    expect(response.status).toBe(401);
    expect(mockUpdateFeatureSetting).not.toHaveBeenCalled();
  });

  it("rejects participants", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });

    const response = await putSetting({ enabled: true });

    expect(response.status).toBe(403);
    expect(mockUpdateFeatureSetting).not.toHaveBeenCalled();
  });

  it("rejects unknown features", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });

    const response = await putSetting({ enabled: true }, "unknown");

    expect(response.status).toBe(404);
    expect(mockUpdateFeatureSetting).not.toHaveBeenCalled();
  });

  it("validates the request body", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });

    const response = await putSetting({ enabled: "yes" });

    expect(response.status).toBe(400);
    expect(mockUpdateFeatureSetting).not.toHaveBeenCalled();
  });

  it("allows an admin to update a registered feature", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });
    mockUpdateFeatureSetting.mockResolvedValue({ enabled: true });

    const response = await putSetting({ enabled: true });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enabled: true });
    expect(mockUpdateFeatureSetting).toHaveBeenCalledWith("test-feature", true);
  });

  it("reports an unavailable game server", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });
    mockUpdateFeatureSetting.mockResolvedValue(null);

    const response = await putSetting({ enabled: false });

    expect(response.status).toBe(502);
  });
});
