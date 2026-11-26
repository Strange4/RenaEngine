// AI contribution: 50% or more AI-generated - used for proper test coverage of the LoginForm component & mocking
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginForm from "./LoginForm";

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockFetch = jest.fn();
const mockAuthRefresh = jest.fn();

jest.mock("./AuthProvider", () => ({
  useAuth: () => ({ refresh: mockAuthRefresh }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

// Types the token and clicks Log In
function fillAndSubmit(token: string) {
  fireEvent.change(screen.getByLabelText("Token"), { target: { value: token } });
  fireEvent.click(screen.getByRole("button", { name: "Log In" }));
}

beforeEach(() => {
  mockReplace.mockReset();
  mockRefresh.mockReset();
  mockFetch.mockReset();
  mockAuthRefresh.mockReset();
  mockAuthRefresh.mockResolvedValue(undefined);
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe("LoginForm", () => {
  it("renders a single token input field", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Token")).toHaveAttribute("type", "text");
    expect(screen.queryByLabelText("ID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("shows a validation error and does not submit when token is empty", () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    expect(screen.getByText("Enter your token")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("logs in a participant and redirects to the participant page", async () => {
    render(<LoginForm />);

    fillAndSubmit("PARTICIPANT-42-secret");

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ token: "PARTICIPANT-42-secret" }),
        }),
      ),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/participant"));
    expect(mockAuthRefresh).toHaveBeenCalledTimes(1);
    expect(mockAuthRefresh.mock.invocationCallOrder[0]).toBeLessThan(
      mockReplace.mock.invocationCallOrder[0],
    );
  });

  it("logs in an admin and redirects to the admin page", async () => {
    render(<LoginForm />);

    fillAndSubmit("ADMIN-secret");

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          body: JSON.stringify({ token: "ADMIN-secret" }),
        }),
      ),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/admin"));
    expect(mockAuthRefresh).toHaveBeenCalledTimes(1);
    expect(mockAuthRefresh.mock.invocationCallOrder[0]).toBeLessThan(
      mockReplace.mock.invocationCallOrder[0],
    );
  });

  it("shows a signing-in screen after a successful login until the redirect", async () => {
    mockAuthRefresh.mockReturnValue(new Promise(() => {}));
    render(<LoginForm />);

    fillAndSubmit("ADMIN-secret");

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Signing you in…",
    );
    expect(screen.queryByLabelText("Token")).not.toBeInTheDocument();
  });

  it("does not show the loading screen when login is rejected", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Token not found" }),
    });
    render(<LoginForm />);

    fillAndSubmit("ADMIN-invalid");

    expect(await screen.findByText("Token not found")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the detected role while typing a valid token", () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Token"), {
      target: { value: "ADMIN-secret" },
    });

    expect(screen.getByText("Role: Admin")).toBeInTheDocument();
  });

  it("shows the detected participant role while typing", () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Token"), {
      target: { value: "PARTICIPANT-42-secret" },
    });

    expect(screen.getByText("Role: Participant #42")).toBeInTheDocument();
  });

  it("shows the server error when login is rejected", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Token not found" }),
    });
    render(<LoginForm />);

    fillAndSubmit("ADMIN-invalid");

    expect(await screen.findByText("Token not found")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockAuthRefresh).not.toHaveBeenCalled();
  });
});
