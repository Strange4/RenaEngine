import { render, screen } from "@testing-library/react";
import LoginPage from "./page";

const mockGetSession = jest.fn();

jest.mock("@/server/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

jest.mock("../../components/AuthProvider", () => ({
  useAuth: () => ({ refresh: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
}));

describe("LoginPage", () => {
  it("renders the login form for a logged-out visitor", async () => {
    mockGetSession.mockResolvedValue(null);

    render(await LoginPage());

    expect(screen.getByRole("heading", { name: "RenaEngine" })).toBeInTheDocument();
    expect(screen.getByLabelText("ID")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("redirects a logged-in admin to the admin page", async () => {
    mockGetSession.mockResolvedValue({ role: "admin", token: "ADMIN-secret" });

    await expect(LoginPage()).rejects.toThrow("REDIRECT:/admin");
  });

  it("redirects a logged-in participant to the participant page", async () => {
    mockGetSession.mockResolvedValue({
      role: "participant",
      participantId: 42,
      token: "PARTICIPANT-42-secret",
    });

    await expect(LoginPage()).rejects.toThrow("REDIRECT:/participant");
  });
});
