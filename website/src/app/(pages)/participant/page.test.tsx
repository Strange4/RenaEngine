import { render, screen } from "@testing-library/react";
import ParticipantPage from "./page";

const mockGetSession = jest.fn();
const mockGetFeatureAccess = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

jest.mock("@/server/lib/feature-access", () => ({
  getFeatureAccess: (featureKey: string) => mockGetFeatureAccess(featureKey),
}));

jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/app/components/AuthProvider", () => ({
  useAuth: () => ({ clear: jest.fn() }),
}));

describe("ParticipantPage", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetFeatureAccess.mockReset();
    mockGetFeatureAccess.mockResolvedValue({
      status: "allowed",
      admin: false,
    });
  });

  it("renders the dashboard for a participant", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });

    render(await ParticipantPage());

    expect(
      screen.getByRole("heading", { name: "Welcome back, Participant #42" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Starter SDK" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Upload submission" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download TypeScript SDK" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("link", { name: "Open test feature" }),
    ).toHaveAttribute("href", "/test-feature");
    expect(
      screen.getByRole("button", { name: "Log Out" }),
    ).toBeInTheDocument();
    expect(mockGetFeatureAccess).toHaveBeenCalledWith("sdk-downloads");
  });

  it("hides SDK download actions when the admin disables the feature", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockGetFeatureAccess.mockResolvedValue({ status: "disabled" });

    render(await ParticipantPage());

    expect(
      screen.getByText("Starter SDK downloads are currently unavailable."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Download .* SDK/ }),
    ).not.toBeInTheDocument();
  });

  it("redirects a logged-out visitor", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(ParticipantPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects an administrator", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });

    await expect(ParticipantPage()).rejects.toThrow("REDIRECT:/admin");
  });
});
