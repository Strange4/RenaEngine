import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SdkDownloadPanel from "./SdkDownloadPanel";

const mockFetch = jest.fn();
const mockCreateObjectUrl = jest.fn();
const mockRevokeObjectUrl = jest.fn();
const mockAnchorClick = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockCreateObjectUrl.mockReset();
  mockRevokeObjectUrl.mockReset();
  mockAnchorClick.mockReset();
  mockCreateObjectUrl.mockReturnValue("blob:archive");
  global.fetch = mockFetch as unknown as typeof fetch;
  URL.createObjectURL = mockCreateObjectUrl;
  URL.revokeObjectURL = mockRevokeObjectUrl;
  jest
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(mockAnchorClick);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("SdkDownloadPanel", () => {
  it("offers each supported participant language", () => {
    render(<SdkDownloadPanel />);

    expect(screen.getByRole("option", { name: "TypeScript" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "C#" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Python" })).toBeInTheDocument();
  });

  it("downloads the selected language through the website proxy", async () => {
    const archive = new Blob(["zip contents"], { type: "application/zip" });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: async () => archive,
    });
    render(<SdkDownloadPanel />);

    fireEvent.change(screen.getByLabelText("Programming language"), {
      target: { value: "python" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Download Python SDK" }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/downloads/python"),
    );
    expect(mockCreateObjectUrl).toHaveBeenCalledWith(archive);
    expect(mockAnchorClick).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Python SDK download started.")).toBeInTheDocument();
  });

  it("shows the server error when an archive is unavailable", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "C# SDK is not available on the game server",
      }),
    });
    render(<SdkDownloadPanel />);

    fireEvent.change(screen.getByLabelText("Programming language"), {
      target: { value: "csharp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Download C# SDK" }));

    expect(
      await screen.findByText("C# SDK is not available on the game server"),
    ).toBeInTheDocument();
    expect(mockCreateObjectUrl).not.toHaveBeenCalled();
  });

  it("recovers after a network failure", async () => {
    mockFetch.mockRejectedValue(new Error("offline"));
    render(<SdkDownloadPanel />);

    fireEvent.click(
      screen.getByRole("button", { name: "Download TypeScript SDK" }),
    );

    expect(
      await screen.findByText(
        "Could not download the SDK. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download TypeScript SDK" }),
    ).toBeEnabled();
  });
});
