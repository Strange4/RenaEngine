import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LogoutButton from "./LogoutButton";

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockClear = jest.fn();
const mockFetch = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

jest.mock("./AuthProvider", () => ({
  useAuth: () => ({ clear: mockClear }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe("LogoutButton", () => {
  it("logs out, clears the auth state and redirects to the login page", async () => {
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
    });
    expect(mockClear).toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
  });
});
