import {
  getFeatureSetting,
  updateFeatureSetting,
} from "./game-server-settings";

const mockFetch = jest.fn();
const originalGameServerUrl = process.env.GAME_SERVER_URL;
const originalAdminToken = process.env.ADMIN_TOKEN;

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  process.env.GAME_SERVER_URL = "https://game-server.example/base";
  process.env.ADMIN_TOKEN = "shared-secret";
});

afterAll(() => {
  process.env.GAME_SERVER_URL = originalGameServerUrl;
  process.env.ADMIN_TOKEN = originalAdminToken;
});

describe("getFeatureSetting", () => {
  it("reads the setting from the game server without caching it", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    });

    await expect(getFeatureSetting("test-feature")).resolves.toEqual({ enabled: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://game-server.example/base/settings/features/test-feature",
      { cache: "no-store" },
    );
  });

  it("fails closed for an unavailable or malformed response", async () => {
    mockFetch.mockRejectedValueOnce(new Error("offline"));
    await expect(getFeatureSetting("test-feature")).resolves.toBeNull();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: "yes" }),
    });
    await expect(getFeatureSetting("test-feature")).resolves.toBeNull();
  });
});

describe("updateFeatureSetting", () => {
  it("sends the shared admin token and requested value", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: false }),
    });

    await expect(updateFeatureSetting("test-feature", false)).resolves.toEqual({
      enabled: false,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://game-server.example/base/settings/features/test-feature",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer shared-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: false }),
        cache: "no-store",
      },
    );
  });

  it("does not send a request when the admin token is missing", async () => {
    delete process.env.ADMIN_TOKEN;

    await expect(updateFeatureSetting("test-feature", true)).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
