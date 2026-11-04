/**
 * @jest-environment node
 */
import { GET } from "./sdk";

const mockGetSession = jest.fn();
const mockFetchSdkArchive = jest.fn();
const mockGetFeatureSetting = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

jest.mock("@/server/lib/game-server-downloads", () => ({
  fetchSdkArchive: (language: string) => mockFetchSdkArchive(language),
}));

jest.mock("@/server/lib/game-server-settings", () => ({
  getFeatureSetting: (featureKey: string) => mockGetFeatureSetting(featureKey),
}));

beforeEach(() => {
  mockGetSession.mockReset();
  mockFetchSdkArchive.mockReset();
  mockGetFeatureSetting.mockReset();
  mockGetFeatureSetting.mockResolvedValue({ enabled: true });
});

describe("GET /api/downloads/[language]", () => {
  it("rejects logged-out visitors", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await GET("typescript");

    expect(response.status).toBe(401);
    expect(mockFetchSdkArchive).not.toHaveBeenCalled();
  });

  it("rejects administrators", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });

    const response = await GET("typescript");

    expect(response.status).toBe(403);
    expect(mockFetchSdkArchive).not.toHaveBeenCalled();
  });

  it("rejects an unregistered language before contacting the server", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });

    const response = await GET("ruby");

    expect(response.status).toBe(404);
    expect(mockFetchSdkArchive).not.toHaveBeenCalled();
  });

  it("reports when the game server cannot be reached", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockFetchSdkArchive.mockResolvedValue(null);

    const response = await GET("typescript");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Could not reach the game server",
    });
  });

  it("rejects downloads when the admin disables the feature", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockGetFeatureSetting.mockResolvedValue({ enabled: false });

    const response = await GET("typescript");

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Starter SDK downloads are currently disabled",
    });
    expect(mockGetFeatureSetting).toHaveBeenCalledWith("sdk-downloads");
    expect(mockFetchSdkArchive).not.toHaveBeenCalled();
  });

  it("preserves an unavailable-language status with a useful error", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockFetchSdkArchive.mockResolvedValue(
      new Response("not supported", { status: 404 }),
    );

    const response = await GET("python");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Python SDK is not available on the game server",
    });
  });

  it("streams an available archive with download headers", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockFetchSdkArchive.mockResolvedValue(
      new Response("zip contents", {
        headers: {
          "Content-Type": "application/zip",
          "Content-Length": "12",
        },
      }),
    );

    const response = await GET("typescript");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Length")).toBe("12");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="typescript.zip"',
    );
    expect(await response.text()).toBe("zip contents");
    expect(mockFetchSdkArchive).toHaveBeenCalledWith("typescript");
  });
});
