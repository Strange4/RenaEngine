import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CodeUploadPanel from "./CodeUploadPanel";

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe("CodeUploadPanel", () => {
  it("requires an archive before uploading", () => {
    render(<CodeUploadPanel />);

    expect(
      screen.getByRole("button", { name: "Upload submission" }),
    ).toBeDisabled();
  });

  it("uploads the selected archive", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(<CodeUploadPanel />);
    const file = new File(["zip contents"], "agent.zip", {
      type: "application/zip",
    });

    fireEvent.change(screen.getByLabelText("Project archive"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload submission" }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/upload");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get("file")).toBe(file);
    expect(
      await screen.findByText("agent.zip was uploaded successfully."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload submission" }),
    ).toBeDisabled();
  });

  it("shows an error returned by the upload API", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Select a ZIP archive to upload" }),
    });
    render(<CodeUploadPanel />);
    const file = new File(["text"], "agent.txt", { type: "text/plain" });

    fireEvent.change(screen.getByLabelText("Project archive"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload submission" }));

    expect(
      await screen.findByText("Select a ZIP archive to upload"),
    ).toBeInTheDocument();
  });

  it("shows a connection error when the request fails", async () => {
    mockFetch.mockRejectedValue(new Error("offline"));
    render(<CodeUploadPanel />);
    const file = new File(["zip"], "agent.zip", {
      type: "application/zip",
    });

    fireEvent.change(screen.getByLabelText("Project archive"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload submission" }));

    expect(
      await screen.findByText(
        "Could not upload the submission. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
  });
});
