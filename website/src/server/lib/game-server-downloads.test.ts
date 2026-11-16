/**
 * @jest-environment node
 */
import { fetchSdkArchive } from "./game-server-downloads";

const mockFetch = jest.fn();
const originalGameServerUrl = process.env.GAME_SERVER_URL;

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  process.env.GAME_SERVER_URL = "https://game-server.example/base";
});

afterAll(() => {
  process.env.GAME_SERVER_URL = originalGameServerUrl;
});

describe("fetchSdkArchive", () => {
  it("requests the selected archive without caching it", async () => {
    const upstream = new Response("zip");
    mockFetch.mockResolvedValue(upstream);

    await expect(fetchSdkArchive("typescript")).resolves.toBe(upstream);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://game-server.example/base/downloads/typescript",
      { cache: "no-store" },
    );
  });

  it("returns null when the game server URL is unavailable", async () => {
    delete process.env.GAME_SERVER_URL;

    await expect(fetchSdkArchive("python")).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null when the request cannot reach the game server", async () => {
    mockFetch.mockRejectedValue(new Error("offline"));

    await expect(fetchSdkArchive("csharp")).resolves.toBeNull();
  });
});
