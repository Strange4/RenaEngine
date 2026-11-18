import { render, screen } from "@testing-library/react";
import { Role } from "@/shared/token";
import AdminPage from "./page";

const mockGetSession = jest.fn();
const mockListParticipantIds = jest.fn();
const mockGetFeatureSetting = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));
jest.mock("@/server/lib/user-store", () => ({
  listParticipantIds: () => mockListParticipantIds(),
}));
jest.mock("@/server/lib/game-server-settings", () => ({
  getFeatureSetting: (key: string) => mockGetFeatureSetting(key),
}));
jest.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
}));
jest.mock("@/app/components/AuthProvider", () => ({
  useAuth: () => ({ clear: jest.fn() }),
}));

beforeEach(() => {
  mockGetSession.mockReset();
  mockListParticipantIds.mockReset();
  mockGetFeatureSetting.mockReset();
});

describe("AdminPage", () => {
  it.each([
    [null, "/login"],
    [{ role: Role.Participant, participantId: 1 }, "/access-denied"],
  ])("redirects unauthorized visitors before loading dashboard data", async (session, path) => {
    mockGetSession.mockResolvedValue(session);
    await expect(AdminPage()).rejects.toThrow(`REDIRECT:${path}`);
    expect(mockListParticipantIds).not.toHaveBeenCalled();
    expect(mockGetFeatureSetting).not.toHaveBeenCalled();
  });

  it("renders tokens and feature controls for an administrator", async () => {
    mockGetSession.mockResolvedValue({ role: Role.Admin, token: "ADMIN-secret" });
    mockListParticipantIds.mockReturnValue([1]);
    mockGetFeatureSetting.mockImplementation(async (key: string) => ({
      enabled: key === "test-feature",
    }));

    render(await AdminPage());

    expect(screen.getByRole("heading", { name: "Welcome back!" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log Out" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Participant tokens" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "#1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate token" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Test feature" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Starter SDK downloads" })).not.toBeChecked();
    expect(screen.getByRole("link", { name: "Open test feature" })).toHaveAttribute("href", "/test-feature");
    expect(screen.getByRole("heading", { name: "Live Viewer" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Participant ID" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open live viewer" })).toBeInTheDocument();
  });

  it("reports a token-store error without hiding unavailable feature settings", async () => {
    mockGetSession.mockResolvedValue({ role: Role.Admin, token: "ADMIN-secret" });
    mockListParticipantIds.mockImplementation(() => {
      throw new Error("SQLITE_CANTOPEN");
    });
    mockGetFeatureSetting.mockResolvedValue(null);
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    render(await AdminPage());

    expect(screen.getByText("Could not load the participant tokens.")).toBeInTheDocument();
    expect(screen.getAllByText("Could not read the game server setting.")).toHaveLength(2);
    consoleError.mockRestore();
  });

  it("shows the empty token state", async () => {
    mockGetSession.mockResolvedValue({ role: Role.Admin, token: "ADMIN-secret" });
    mockListParticipantIds.mockReturnValue([]);
    mockGetFeatureSetting.mockResolvedValue({ enabled: false });

    render(await AdminPage());

    expect(screen.getByText("No participant tokens have been created yet.")).toBeInTheDocument();
  });
});
