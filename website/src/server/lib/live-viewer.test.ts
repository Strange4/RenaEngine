/**
 * @jest-environment node
 */
import {
  createReadableStream,
  createReadableStreamFromSource,
} from "./live-viewer";

const mockFetch = jest.fn();
const originalGameServerUrl = process.env.GAME_SERVER_URL;

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  process.env.GAME_SERVER_URL = "https://game-server.example/base";
});

afterAll(() => {
  if (originalGameServerUrl === undefined) {
    delete process.env.GAME_SERVER_URL;
  } else {
    process.env.GAME_SERVER_URL = originalGameServerUrl;
  }
});

describe("createReadableStream", () => {
  it.each([
    ["without a trailing slash", "https://game-server.example/base"],
    ["with a trailing slash", "https://game-server.example/base/"],
  ])("requests the participant event stream when the base URL is %s", async (_, baseUrl) => {
    process.env.GAME_SERVER_URL = baseUrl;
    const response = new Response("event data");
    const signal = new AbortController().signal;
    mockFetch.mockResolvedValue(response);

    await expect(createReadableStream(42, signal)).resolves.toBe(response.body);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://game-server.example/base/render/stream/42",
      {
        headers: { Accept: "text/event-stream" },
        signal,
      },
    );
  });

  it("returns null without making a request when the game server URL is missing", async () => {
    delete process.env.GAME_SERVER_URL;

    await expect(
      createReadableStream(42, new AbortController().signal),
    ).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null when the game server responds unsuccessfully", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(
      createReadableStream(42, new AbortController().signal),
    ).resolves.toBeNull();
  });
});

describe("createReadableStreamFromSource", () => {
  it("enqueues the data from change events", async () => {
    let changeListener: ((event: MessageEvent<string>) => void) | undefined;
    const addEventListener = jest.fn(
      (_type: string, listener: (event: MessageEvent<string>) => void) => {
        changeListener = listener;
      },
    );
    const eventSource = { addEventListener } as unknown as EventSource;
    const stream = createReadableStreamFromSource(eventSource);
    const reader = stream.getReader();

    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    changeListener?.(new MessageEvent("change", { data: '{"index":1}' }));
    await expect(reader.read()).resolves.toEqual({
      value: '{"index":1}',
      done: false,
    });

    await reader.cancel();
  });
});
