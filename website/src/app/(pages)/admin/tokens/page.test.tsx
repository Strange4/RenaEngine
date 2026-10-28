import { render, screen } from "@testing-library/react";
import AdminTokensPage from "./page";
import { Role } from "@/shared/token";

const mockGetSession = jest.fn();
const mockListParticipantTokens = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

jest.mock("@/server/lib/participant-token-store", () => ({
  listParticipantTokens: () => mockListParticipantTokens(),
}));

jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

beforeEach(() => {
  mockGetSession.mockReset();
  mockListParticipantTokens.mockReset();
});

describe("AdminTokensPage", () => {
  it("redirects logged-out visitors to login", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(AdminTokensPage()).rejects.toThrow("REDIRECT:/login");
    expect(mockListParticipantTokens).not.toHaveBeenCalled();
  });

  it("blocks participants before loading any tokens", async () => {
    mockGetSession.mockResolvedValue({
      role: Role.Participant,
      participantId: 4,
      token: "PARTICIPANT-4-secret",
    });

    await expect(AdminTokensPage()).rejects.toThrow("REDIRECT:/access-denied");
    expect(mockListParticipantTokens).not.toHaveBeenCalled();
  });

  it("shows the token table to an admin", async () => {
    mockGetSession.mockResolvedValue({ role: Role.Admin, token: "ADMIN-secret" });
    mockListParticipantTokens.mockResolvedValue([
      {
        participantId: 1,
        token: "PARTICIPANT-1-secret",
        active: true,
        lastSubmissionAt: null,
      },
    ]);

    render(await AdminTokensPage());

    expect(
      screen.getByRole("heading", { name: "Participant Tokens" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to admin" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("explains when the token store cannot be read", async () => {
    mockGetSession.mockResolvedValue({ role: Role.Admin, token: "ADMIN-secret" });
    mockListParticipantTokens.mockResolvedValue(null);

    render(await AdminTokensPage());

    expect(
      screen.getByText("Could not load the participant tokens."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
