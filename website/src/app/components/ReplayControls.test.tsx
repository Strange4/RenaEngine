import { fireEvent, render, screen } from "@testing-library/react";
import ReplayControls from "./ReplayControls";
import { PLAYBACK_SPEEDS, ReplayController } from "@/app/viewer/replayController";

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
      "Speed 1x",
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

describe("speed menu", ()=>{

  it("displays current speed on control bar", ()=>{
    render(<ReplayControls speed={.25} />);
    expect(button("Speed 1.25x")).toHaveTextContent("Speed 1.25x");
  });

  it("menu opens with the current speed made evident-- checked", ()=>{
    render(<ReplayControls speed={1.5} />);
    fireEvent.click(button("Speed 1.5x"));

    expect(button("Speed 1.5x")).toHaveAttribute("aria-expanded", "true"); //open menu expanded
    const options = screen.getAllByRole("menuitemradio"); //options as radio buttons
    expect(options.map((option) => option.textContent)).toEqual(PLAYBACK_SPEEDS.map((speed) =>`${speed}x`));
    //the current speed is the only one made evident and checked
    expect(options.filter((option)=> option.getAttribute("aria-checked") === "true")).toEqual([screen.getByRole("menuitemradio", {name: "1.5x"})]);

  });

  //dropdown menu of speed options closes/ collapses when the user clicks anywhere on the screen
  it("dropdown collapses when user clicks mousedown on screen", ()=>{
    render(<ReplayControls />);
    fireEvent.click(button("Speed 1x"));
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

});
