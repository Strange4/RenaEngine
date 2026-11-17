import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { zipFile } from "@/test-utils/zip";
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
    const file = zipFile(["main.ts"]);

    fireEvent.change(screen.getByLabelText("Project archive"), {
      target: { files: [file] },
    });
    const button = await screen.findByRole("button", {
      name: "Upload submission",
    });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

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
    const file = zipFile(["main.ts"]);

    fireEvent.change(screen.getByLabelText("Project archive"), {
      target: { files: [file] },
    });
    const button = await screen.findByRole("button", {
      name: "Upload submission",
    });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(
      await screen.findByText("Select a ZIP archive to upload"),
    ).toBeInTheDocument();
  });

  it("shows a fallback error when the upload API has no JSON error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("not JSON");
      },
    });
    render(<CodeUploadPanel />);
    const input = screen.getByLabelText("Project archive");
    fireEvent.change(input, { target: { files: [zipFile(["main.ts"])] } });
    const button = await screen.findByRole("button", {
      name: "Upload submission",
    });
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    expect(
      await screen.findByText("Could not upload the submission. Please try again."),
    ).toBeInTheDocument();
  });

  it("shows a connection error when the request fails", async () => {
    mockFetch.mockRejectedValue(new Error("offline"));
    render(<CodeUploadPanel />);
    const file = zipFile(["main.ts"]);

    fireEvent.change(screen.getByLabelText("Project archive"), {
      target: { files: [file] },
    });
    const button = await screen.findByRole("button", {
      name: "Upload submission",
    });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(
      await screen.findByText(
        "Could not upload the submission. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("rejects a non-ZIP file before sending it", async () => {
    render(<CodeUploadPanel />);
    const file = new File(["text"], "agent.txt", { type: "text/plain" });

    fireEvent.change(screen.getByLabelText("Project archive"), {
      target: { files: [file] },
    });

    expect(
      await screen.findByText("Select a ZIP archive to upload"),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects an archive without main.ts", async () => {
    render(<CodeUploadPanel />);

    fireEvent.change(screen.getByLabelText("Project archive"), {
      target: { files: [zipFile(["src/main.ts"])] },
    });

    expect(
      await screen.findByText(/Invalid ZIP structure/),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("accepts a valid archive dropped on the dropzone", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(<CodeUploadPanel />);
    const file = zipFile(["main.ts"]);
    const dropzone = screen
      .getByText("Drop a ZIP archive here or select a file")
      .closest("label");

    fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });

    expect(await screen.findByText("Selected: agent.zip")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload submission" }),
    ).toBeEnabled();
  });

  it("shows drag feedback and safely ignores empty selections", () => {
    render(<CodeUploadPanel />);
    const dropzone = screen
      .getByText("Drop a ZIP archive here or select a file")
      .closest("label")!;

    fireEvent.dragEnter(dropzone);
    expect(dropzone.className).toContain("uploadDropzoneActive");
    fireEvent.dragOver(dropzone);
    fireEvent.dragLeave(dropzone, { relatedTarget: document.body });
    expect(dropzone.className).not.toContain("uploadDropzoneActive");

    fireEvent.change(screen.getByLabelText("Project archive"), {
      target: { files: [] },
    });
    fireEvent.submit(dropzone.closest("form")!);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("ignores a drop while an upload is in progress", async () => {
    let finishUpload: ((response: { ok: boolean }) => void) | undefined;
    mockFetch.mockImplementation(
      () => new Promise((resolve) => (finishUpload = resolve)),
    );
    render(<CodeUploadPanel />);
    fireEvent.change(screen.getByLabelText("Project archive"), {
      target: { files: [zipFile(["main.ts"])] },
    });
    const button = await screen.findByRole("button", {
      name: "Upload submission",
    });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByRole("button", { name: "Uploading…" })).toBeDisabled();

    const dropzone = screen
      .getByText("Drop a ZIP archive here or select a file")
      .closest("label")!;
    fireEvent.dragEnter(dropzone);
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [zipFile(["main.ts"], "replacement.zip")] },
    });
    expect(screen.queryByText("Selected: replacement.zip")).not.toBeInTheDocument();

    finishUpload?.({ ok: true });
    expect(await screen.findByText("agent.zip was uploaded successfully.")).toBeInTheDocument();
  });
});
