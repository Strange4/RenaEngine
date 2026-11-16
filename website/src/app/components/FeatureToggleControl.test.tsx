import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FeatureToggleControl from "./FeatureToggleControl";
import { TEST_FEATURE } from "@/shared/features";

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe("FeatureToggleControl", () => {
  it("shows the current setting", () => {
    render(
      <FeatureToggleControl feature={TEST_FEATURE} initialEnabled={false} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Participant access: Disabled",
    );
    expect(
      screen.getByRole("switch", { name: "Test feature" }),
    ).not.toBeChecked();
  });

  it("updates the setting through the protected website endpoint", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    });
    render(
      <FeatureToggleControl feature={TEST_FEATURE} initialEnabled={false} />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Test feature" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Participant access: Enabled",
      ),
    );
    expect(screen.getByRole("switch", { name: "Test feature" })).toBeChecked();
    expect(mockFetch).toHaveBeenCalledWith("/api/settings/features/test-feature", {
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
    render(
      <FeatureToggleControl feature={TEST_FEATURE} initialEnabled={false} />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Test feature" }));

    expect(await screen.findByText("Game server unavailable")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Participant access: Disabled",
    );
    expect(screen.getByRole("switch", { name: "Test feature" })).not.toBeChecked();
  });

  it("shows unavailable settings and allows retrying", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    });
    render(<FeatureToggleControl feature={TEST_FEATURE} initialEnabled={null} />);

    expect(screen.getByRole("status")).toHaveTextContent("Participant access: Unavailable");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not read the game server setting.");
    fireEvent.click(screen.getByRole("switch", { name: "Test feature" }));

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Test feature" })).toBeChecked(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
