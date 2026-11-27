/**
 * @jest-environment node
 */
// AI contribution: No substantial AI-generated code
import { NextRequest } from "next/server";
import { Role } from "@/shared/token";
import { GET } from "./sse";

const mockGetSession = jest.fn();
jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

const mockCreateReadableStream = jest.fn();
jest.mock("@/server/lib/live-viewer", () => ({
  createReadableStream: (...args: unknown[]) => mockCreateReadableStream(...args),
}));

const admin = { role: Role.Admin, token: "ADMIN-secret" };
const participant42 = { role: Role.Participant, participantId: 42, token: "PARTICIPANT-42-secret" };
const EVENT = 'event: change\ndata: {"index":1,"changes":[]}\n\n';

const request = () => new NextRequest("http://localhost/api/viewer/sse/42");

const stream = () =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(EVENT));
      controller.close();
    },
  });

describe("GET /api/viewer/sse/[participantId]", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockCreateReadableStream.mockReset();
  });

  it("returns 401 when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await GET(request(), "42");

    expect(response.status).toBe(401);
    expect(mockCreateReadableStream).not.toHaveBeenCalled();
  });

  it("returns 403 for someone else's game", async () => {
    mockGetSession.mockResolvedValue({ ...participant42, participantId: 7 });

    const response = await GET(request(), "42");

    expect(response.status).toBe(403);
    expect(mockCreateReadableStream).not.toHaveBeenCalled();
  });

  it("streams the participant's own game", async () => {
    mockGetSession.mockResolvedValue(participant42);
    mockCreateReadableStream.mockResolvedValue(stream());
    const req = request();

    const response = await GET(req, "42");

    expect(response.status).toBe(200);
    expect(mockCreateReadableStream).toHaveBeenCalledWith(42, req.signal);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(await response.text()).toBe(EVENT);
  });

  it("lets admins watch any game", async () => {
    mockGetSession.mockResolvedValue(admin);
    mockCreateReadableStream.mockResolvedValue(stream());

    const response = await GET(request(), "13");

    expect(response.status).toBe(200);
    expect(mockCreateReadableStream).toHaveBeenCalledWith(13, expect.anything());
  });

  it("returns 400 for an invalid id", async () => {
    mockGetSession.mockResolvedValue(admin);

    const response = await GET(request(), "abc");

    expect(response.status).toBe(400);
    expect(mockCreateReadableStream).not.toHaveBeenCalled();
  });

  it("returns 502 when the game server is down", async () => {
    mockGetSession.mockResolvedValue(participant42);
    mockCreateReadableStream.mockResolvedValue(null);

    const response = await GET(request(), "42");

    expect(response.status).toBe(502);
  });
});
