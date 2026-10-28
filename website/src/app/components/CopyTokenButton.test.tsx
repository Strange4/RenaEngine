import { act, fireEvent, render, screen } from "@testing-library/react";
import CopyTokenButton from "./CopyTokenButton";

const mockWriteText = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  mockWriteText.mockReset();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mockWriteText },
  });
});

afterEach(() => {
  jest.useRealTimers();
});

function clickCopy() {
  fireEvent.click(
    screen.getByRole("button", { name: "Copy token for participant 7" }),
  );
}

describe("CopyTokenButton", () => {
  it("copies the token and briefly shows a confirmation", async () => {
    mockWriteText.mockResolvedValue(undefined);
    render(<CopyTokenButton token="PARTICIPANT-7-secret" participantId={7} />);

    clickCopy();

    expect(await screen.findByText("Copied!")).toBeInTheDocument();
    expect(mockWriteText).toHaveBeenCalledWith("PARTICIPANT-7-secret");

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });

  it("tells the admin when the clipboard rejects the copy", async () => {
    mockWriteText.mockRejectedValue(new Error("denied"));
    render(<CopyTokenButton token="PARTICIPANT-7-secret" participantId={7} />);

    clickCopy();

    expect(await screen.findByText("Copy failed")).toBeInTheDocument();
  });

  it("reports a failure when the clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    render(<CopyTokenButton token="PARTICIPANT-7-secret" participantId={7} />);

    clickCopy();

    expect(await screen.findByText("Copy failed")).toBeInTheDocument();
  });

  it("restarts the confirmation timer on repeated clicks", async () => {
    mockWriteText.mockResolvedValue(undefined);
    const { unmount } = render(
      <CopyTokenButton token="PARTICIPANT-7-secret" participantId={7} />,
    );

    clickCopy();
    await screen.findByText("Copied!");
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    clickCopy();
    await screen.findByText("Copied!");
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();
    unmount();
  });
});
