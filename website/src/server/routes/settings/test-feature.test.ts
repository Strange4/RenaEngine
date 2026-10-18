/**
 * @jest-environment node
 */
import { PUT } from "./test-feature";

const mockGetSession = jest.fn();
const mockUpdateTestFeatureSetting = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

jest.mock("@/server/lib/game-server-settings", () => ({
  updateTestFeatureSetting: (enabled: boolean) =>
    mockUpdateTestFeatureSetting(enabled),
}));

function putSetting(body: unknown) {
  return PUT(
    new Request("http://localhost/api/settings/test-feature", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockUpdateTestFeatureSetting.mockReset();
});

describe("PUT /api/settings/test-feature", () => {
  it("rejects logged-out visitors", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await putSetting({ enabled: true });

    expect(response.status).toBe(401);
    expect(mockUpdateTestFeatureSetting).not.toHaveBeenCalled();
  });

  it("rejects participants", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });

    const response = await putSetting({ enabled: true });

    expect(response.status).toBe(403);
    expect(mockUpdateTestFeatureSetting).not.toHaveBeenCalled();
  });

  it("validates the request body", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });

    const response = await putSetting({ enabled: "yes" });

    expect(response.status).toBe(400);
    expect(mockUpdateTestFeatureSetting).not.toHaveBeenCalled();
  });

  it("allows an admin to update the setting", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });
    mockUpdateTestFeatureSetting.mockResolvedValue({ enabled: true });

    const response = await putSetting({ enabled: true });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enabled: true });
    expect(mockUpdateTestFeatureSetting).toHaveBeenCalledWith(true);
  });

  it("reports an unavailable game server", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });
    mockUpdateTestFeatureSetting.mockResolvedValue(null);

    const response = await putSetting({ enabled: false });

    expect(response.status).toBe(502);
  });
});
