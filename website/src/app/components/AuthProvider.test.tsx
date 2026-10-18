import { act, render, screen, waitFor } from "@testing-library/react";
import AuthProvider, { useAuth } from "./AuthProvider";
import { Role } from "@/shared/token";

const mockFetch = jest.fn();

function Probe() {
  const { status, user, refresh, clear } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user ? JSON.stringify(user) : "none"}</p>
      <button onClick={refresh}>refresh</button>
      <button onClick={clear}>clear</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

function respondWith(ok: boolean, body: unknown = {}) {
  mockFetch.mockResolvedValue({ ok, json: async () => body });
}

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe("AuthProvider", () => {
  it("starts loading and checks the session endpoint on mount", async () => {
    respondWith(false);
    renderProbe();

    expect(screen.getByTestId("status")).toHaveTextContent("loading");
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"),
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/me", {
      credentials: "same-origin",
    });
  });

  it("hydrates an admin session", async () => {
    respondWith(true, { role: Role.Admin });
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated"),
    );
    expect(screen.getByTestId("user")).toHaveTextContent(
      JSON.stringify({ role: Role.Admin }),
    );
  });

  it("hydrates a participant session", async () => {
    respondWith(true, { role: Role.Participant, participantId: 7 });
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated"),
    );
    expect(screen.getByTestId("user")).toHaveTextContent(
      JSON.stringify({ role: Role.Participant, participantId: 7 }),
    );
  });

  it("is unauthenticated when the server returns 401", async () => {
    respondWith(false, { error: "Not authenticated" });
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"),
    );
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("is unauthenticated when the request fails", async () => {
    mockFetch.mockRejectedValue(new Error("network"));
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"),
    );
  });

  it("is unauthenticated when the response body is not valid JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("bad json");
      },
    });
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"),
    );
  });

  it("refresh re-reads the session and clear resets it", async () => {
    respondWith(false);
    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"),
    );

    respondWith(true, { role: Role.Admin });
    await act(async () => {
      screen.getByText("refresh").click();
    });
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");

    act(() => {
      screen.getByText("clear").click();
    });
    expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("ignores a response that arrives after unmount", async () => {
    let resolve: (value: unknown) => void = () => {};
    mockFetch.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = renderProbe();
    unmount();

    await act(async () => {
      resolve({ ok: true, json: async () => ({ role: Role.Admin }) });
    });
  });
});

describe("useAuth", () => {
  it("throws outside of an AuthProvider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );
    spy.mockRestore();
  });
});
