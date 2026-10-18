import { render, screen } from "@testing-library/react";
import TestFeaturePage from "./page";

const mockGetFeatureAccess = jest.fn();

jest.mock("@/server/lib/feature-access", () => ({
  getFeatureAccess: (featureKey: string) => mockGetFeatureAccess(featureKey),
}));

jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

beforeEach(() => {
  mockGetFeatureAccess.mockReset();
});

describe("TestFeaturePage", () => {
  it("redirects logged-out visitors to login", async () => {
    mockGetFeatureAccess.mockResolvedValue({ status: "unauthenticated" });

    await expect(TestFeaturePage()).rejects.toThrow("REDIRECT:/login");
  });

  it("shows the disabled notice to a participant when the switch is off", async () => {
    mockGetFeatureAccess.mockResolvedValue({ status: "disabled" });

    render(await TestFeaturePage());

    expect(
      screen.getByRole("heading", { name: "Feature Disabled" }),
    ).toBeInTheDocument();
  });

  it("shows the feature to a participant when the switch is on", async () => {
    mockGetFeatureAccess.mockResolvedValue({ status: "allowed", admin: false });

    render(await TestFeaturePage());

    expect(
      screen.getByRole("heading", { name: "Test Feature" }),
    ).toBeInTheDocument();
  });

  it("shows the feature to an admin using the shared access result", async () => {
    mockGetFeatureAccess.mockResolvedValue({ status: "allowed", admin: true });

    render(await TestFeaturePage());

    expect(
      screen.getByRole("heading", { name: "Test Feature" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Administrator access bypasses the feature switch."),
    ).toBeInTheDocument();
  });
});
