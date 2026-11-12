/**
 * @jest-environment node
 */
import { POST } from "./submission";

const mockGetSession = jest.fn();
const mockUploadSubmission = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

jest.mock("@/server/lib/game-server-uploads", () => ({
  uploadSubmission: (participantId: number, file: File) =>
    mockUploadSubmission(participantId, file),
}));

function uploadRequest(file?: File): Request {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockUploadSubmission.mockReset();
});

describe("POST /api/upload", () => {
  it("rejects logged-out visitors", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await POST(uploadRequest());

    expect(response.status).toBe(401);
    expect(mockUploadSubmission).not.toHaveBeenCalled();
  });

  it("rejects administrators", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });

    const response = await POST(uploadRequest());

    expect(response.status).toBe(403);
    expect(mockUploadSubmission).not.toHaveBeenCalled();
  });

  it("requires a non-empty archive", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });

    const response = await POST(uploadRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Select a ZIP archive to upload",
    });
    expect(mockUploadSubmission).not.toHaveBeenCalled();
  });

  it("uploads the archive using the participant session", async () => {
    const file = new File(["zip contents"], "agent.zip", {
      type: "application/zip",
    });
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockUploadSubmission.mockResolvedValue(
      new Response(null, { status: 202 }),
    );

    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: "accepted" });
    expect(mockUploadSubmission).toHaveBeenCalledTimes(1);
    expect(mockUploadSubmission.mock.calls[0][0]).toBe(42);
    expect(mockUploadSubmission.mock.calls[0][1]).toMatchObject({
      name: "agent.zip",
      size: file.size,
      type: "application/zip",
    });
  });

  it("reports when the game server cannot be reached", async () => {
    const file = new File(["zip"], "agent.zip");
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockUploadSubmission.mockResolvedValue(null);

    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Could not reach the game server",
    });
  });

  it("preserves upload validation errors from the game server", async () => {
    const file = new File(["too large"], "agent.zip");
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockUploadSubmission.mockResolvedValue(
      new Response(null, { status: 413 }),
    );

    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: "The selected ZIP exceeds the 8 MiB upload limit",
    });
  });
});
