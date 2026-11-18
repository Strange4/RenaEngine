import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ParticipantTokenManager from "./ParticipantTokenManager";

const mockFetch = jest.fn();

// jsdom does not implement modal dialogs, so mimic the browser: showModal
// opens the dialog and close() hides it and fires a "close" event.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

function respondWith(ok: boolean, body: unknown) {
  mockFetch.mockResolvedValue({ ok, json: async () => body });
}

function clickGenerate() {
  fireEvent.click(screen.getByRole("button", { name: "Generate token" }));
}

function participantRows() {
  return screen
    .getAllByRole("rowheader")
    .map((cell) => cell.textContent);
}

describe("ParticipantTokenManager", () => {
  it("lists the participants it starts with", () => {
    render(<ParticipantTokenManager initialParticipantIds={[1, 2]} />);

    expect(participantRows()).toEqual(["#1", "#2"]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("generates a token, adds the row and shows the token once in a dialog", async () => {
    respondWith(true, { participantId: 3, token: "PARTICIPANT-3-secret" });
    render(<ParticipantTokenManager initialParticipantIds={[1, 2]} />);

    clickGenerate();

    const dialog = await screen.findByRole("dialog", {
      name: "Token for participant #3",
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/admin/tokens", { method: "POST" });
    expect(within(dialog).getByText("PARTICIPANT-3-secret")).toBeInTheDocument();
    expect(within(dialog).getByText(/will not be shown again/)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Copy token for participant 3" }),
    ).toBeInTheDocument();
    expect(participantRows()).toEqual(["#1", "#2", "#3"]);
  });

  it("removes the token from the page when the dialog is closed", async () => {
    respondWith(true, { participantId: 1, token: "PARTICIPANT-1-secret" });
    render(<ParticipantTokenManager initialParticipantIds={[]} />);
    clickGenerate();
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("PARTICIPANT-1-secret")).not.toBeInTheDocument();
    expect(participantRows()).toEqual(["#1"]);
  });

  it("disables the button while a token is being generated", async () => {
    let resolve: (value: unknown) => void = () => {};
    mockFetch.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<ParticipantTokenManager initialParticipantIds={[]} />);

    clickGenerate();

    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();
    await act(async () =>
      resolve({ ok: true, json: async () => ({ participantId: 1, token: "PARTICIPANT-1-x" }) }),
    );
    expect(screen.getByRole("button", { name: "Generate token" })).toBeEnabled();
  });

  it("shows the server error when generation fails", async () => {
    respondWith(false, { error: "Access denied" });
    render(<ParticipantTokenManager initialParticipantIds={[1]} />);

    clickGenerate();

    expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
    expect(participantRows()).toEqual(["#1"]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    ["the server cannot be reached", () => mockFetch.mockRejectedValue(new Error("offline"))],
    ["the response is malformed", () => respondWith(true, { participantId: "1" })],
  ])("shows a fallback error when %s", async (_case, setup) => {
    setup();
    render(<ParticipantTokenManager initialParticipantIds={[]} />);

    clickGenerate();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not generate a token",
    );
  });

  it("clears a previous error when generating again", async () => {
    respondWith(false, { error: "Access denied" });
    render(<ParticipantTokenManager initialParticipantIds={[]} />);
    clickGenerate();
    await screen.findByRole("alert");

    respondWith(true, { participantId: 1, token: "PARTICIPANT-1-secret" });
    clickGenerate();

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
