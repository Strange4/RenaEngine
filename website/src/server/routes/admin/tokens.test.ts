/**
 * @jest-environment node
 */
import { POST } from "./tokens";

const mockGetSession = jest.fn();
const mockCreateParticipant = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));
jest.mock("@/server/lib/user-store", () => ({
  createParticipant: () => mockCreateParticipant(),
}));

beforeEach(() => {
  mockGetSession.mockReset();
  mockCreateParticipant.mockReset();
});

describe("POST /api/admin/tokens", () => {
  it("rejects logged-out visitors", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mockCreateParticipant).not.toHaveBeenCalled();
  });

  it("rejects participants", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });

    const response = await POST();

    expect(response.status).toBe(403);
    expect(mockCreateParticipant).not.toHaveBeenCalled();
  });

  it("creates a participant and returns its token once", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });
    mockCreateParticipant.mockReturnValue({
      participantId: 7,
      token: "PARTICIPANT-7-secret",
    });

    const response = await POST();

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      participantId: 7,
      token: "PARTICIPANT-7-secret",
    });
  });

  it("reports a database failure without leaking details", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });
    mockCreateParticipant.mockImplementation(() => {
      throw new Error("SQLITE_BUSY: database is locked");
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Could not create a participant token",
    });
    consoleError.mockRestore();
  });
});
