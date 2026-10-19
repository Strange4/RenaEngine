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

// Types the ID and password, then clicks Log In.
function fillAndSubmit(id: string, password: string) {
  fireEvent.change(screen.getByLabelText("ID"), { target: { value: id } });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
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
  it("renders separate ID and password fields", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("ID")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("shows a validation error and does not submit when password is empty", () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("ID"), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    expect(
      screen.getByText("Enter ADMIN or a participant number, and a password"),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows a validation error when the ID is neither admin nor a number", () => {
    render(<LoginForm />);

    fillAndSubmit("bob", "secret");

    expect(
      screen.getByText("Enter ADMIN or a participant number, and a password"),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("logs in a participant and redirects to the participant page", async () => {
    render(<LoginForm />);

    fillAndSubmit("42", "secret");

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ id: "42", password: "secret" }),
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

    fillAndSubmit("admin", "secret");

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          body: JSON.stringify({ id: "admin", password: "secret" }),
        }),
      ),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/admin"));
    expect(mockAuthRefresh).toHaveBeenCalledTimes(1);
    expect(mockAuthRefresh.mock.invocationCallOrder[0]).toBeLessThan(
      mockReplace.mock.invocationCallOrder[0],
    );
  });

  it("shows the detected role while typing", () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("ID"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });

    expect(screen.getByText("Detected role: Admin")).toBeInTheDocument();
  });

  it("shows the server error when login is rejected", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Wrong credentials" }),
    });
    render(<LoginForm />);

    fillAndSubmit("42", "wrong");

    expect(await screen.findByText("Wrong credentials")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockAuthRefresh).not.toHaveBeenCalled();
  });
});
