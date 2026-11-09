import { fireEvent, render, screen } from "@testing-library/react";
import ReplayControls from "./ReplayControls";

const button = (name: string) => screen.getByRole("button", { name });

describe("ReplayControls", () => {
  it("shows the buttons in order", () => {
    render(<ReplayControls />);

    expect(screen.getByRole("toolbar", { name: "Replay controls" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
      "Step back",
      "Go to start",
      "Play",
      "Go to end",
      "Step forward",
    ]);
  });

  it("does not crash without handlers", () => {
    render(<ReplayControls />);

    for (const button of screen.getAllByRole("button")) {
      expect(() => fireEvent.click(button)).not.toThrow();
    }
  });

  it("calls the handlers", () => {
    const handlers = {
      onPlay: jest.fn(),
      onStepBackward: jest.fn(),
      onStepForward: jest.fn(),
      onGoToStart: jest.fn(),
      onGoToEnd: jest.fn(),
    };
    render(<ReplayControls {...handlers} />);

    fireEvent.click(button("Step back"));
    fireEvent.click(button("Go to start"));
    fireEvent.click(button("Play"));
    fireEvent.click(button("Go to end"));
    fireEvent.click(button("Step forward"));

    for (const handler of Object.values(handlers)) {
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });

  it("shows pause while playing", () => {
    const onPause = jest.fn();
    render(<ReplayControls playing onPause={onPause} />);

    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
    fireEvent.click(button("Pause"));

    expect(onPause).toHaveBeenCalledTimes(1);
  });
});
