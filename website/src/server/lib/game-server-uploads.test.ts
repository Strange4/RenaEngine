/**
 * @jest-environment node
 */
import { uploadSubmission } from "./game-server-uploads";

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

describe("uploadSubmission", () => {
  it("uploads the archive for the participant", async () => {
    const upstream = new Response(null, { status: 202 });
    const file = new File(["zip contents"], "agent.zip", {
      type: "application/zip",
    });
    mockFetch.mockResolvedValue(upstream);

    await expect(uploadSubmission(42, file)).resolves.toBe(upstream);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://game-server.example/base/upload/PLAYER-42");
    expect(options).toMatchObject({
      method: "POST",
      cache: "no-store",
    });
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get("file")).toMatchObject({
      name: "agent.zip",
      size: file.size,
      type: "application/zip",
    });
  });

  it("returns null when the game server URL is unavailable", async () => {
    delete process.env.GAME_SERVER_URL;
    const file = new File(["zip"], "agent.zip");

    await expect(uploadSubmission(42, file)).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null when the game server cannot be reached", async () => {
    const file = new File(["zip"], "agent.zip");
    mockFetch.mockRejectedValue(new Error("offline"));

    await expect(uploadSubmission(42, file)).resolves.toBeNull();
  });
});
