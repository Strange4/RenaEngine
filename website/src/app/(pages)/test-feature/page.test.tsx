import { render, screen } from "@testing-library/react";
import TestFeaturePage from "./page";

const mockGetSession = jest.fn();
const mockGetTestFeatureSetting = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

jest.mock("@/server/lib/game-server-settings", () => ({
  getTestFeatureSetting: () => mockGetTestFeatureSetting(),
}));

jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetTestFeatureSetting.mockReset();
});

describe("TestFeaturePage", () => {
  it("redirects logged-out visitors to login", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(TestFeaturePage()).rejects.toThrow("REDIRECT:/login");
  });

  it("shows the disabled notice to a participant when the switch is off", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockGetTestFeatureSetting.mockResolvedValue({ enabled: false });

    render(await TestFeaturePage());

    expect(
      screen.getByRole("heading", { name: "Feature Disabled" }),
    ).toBeInTheDocument();
  });

  it("fails closed when the setting cannot be read", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockGetTestFeatureSetting.mockResolvedValue(null);

    render(await TestFeaturePage());

    expect(
      screen.getByRole("heading", { name: "Feature Disabled" }),
    ).toBeInTheDocument();
  });

  it("shows the feature to a participant when the switch is on", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });
    mockGetTestFeatureSetting.mockResolvedValue({ enabled: true });

    render(await TestFeaturePage());

    expect(
      screen.getByRole("heading", { name: "Test Feature" }),
    ).toBeInTheDocument();
  });

  it("lets admins bypass the switch without requesting its state", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });

    render(await TestFeaturePage());

    expect(
      screen.getByRole("heading", { name: "Test Feature" }),
    ).toBeInTheDocument();
    expect(mockGetTestFeatureSetting).not.toHaveBeenCalled();
  });
});
