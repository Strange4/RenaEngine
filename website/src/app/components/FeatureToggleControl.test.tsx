import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FeatureToggleControl from "./FeatureToggleControl";

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe("FeatureToggleControl", () => {
  it("shows the current setting", () => {
    render(<FeatureToggleControl initialEnabled={false} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Participant access: Disabled",
    );
    expect(
      screen.getByRole("button", { name: "Enable feature" }),
    ).toBeInTheDocument();
  });

  it("updates the setting through the protected website endpoint", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    });
    render(<FeatureToggleControl initialEnabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Enable feature" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Participant access: Enabled",
      ),
    );
    expect(mockFetch).toHaveBeenCalledWith("/api/settings/test-feature", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
  });

  it("shows an error without changing state when an update fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Game server unavailable" }),
    });
    render(<FeatureToggleControl initialEnabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Enable feature" }));

    expect(await screen.findByText("Game server unavailable")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Participant access: Disabled",
    );
  });
});
