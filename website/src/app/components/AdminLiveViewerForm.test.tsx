import { fireEvent, render, screen } from "@testing-library/react";
import AdminLiveViewerForm from "./AdminLiveViewerForm";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("AdminLiveViewerForm", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it.each([
    ["42", "/live-viewer/42"],
    ["+007", "/live-viewer/7"],
    ["-1", "/live-viewer/-1"],
    ["0", "/live-viewer/0"],
  ])("navigates to the viewer for integer %s", (value, path) => {
    render(<AdminLiveViewerForm />);
    fireEvent.change(screen.getByRole("textbox", { name: "Participant ID" }), {
      target: { value },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open live viewer" }));

    expect(mockPush).toHaveBeenCalledWith(path);
  });

  it.each(["", " ", "1.5", "1e2", "42abc", " 42", "9007199254740992"])(
    "rejects invalid input %s",
    (value) => {
      render(<AdminLiveViewerForm />);
      const input = screen.getByRole("textbox", { name: "Participant ID" });
      fireEvent.change(input, { target: { value } });
      fireEvent.click(screen.getByRole("button", { name: "Open live viewer" }));

      expect(mockPush).not.toHaveBeenCalled();
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Enter an appropriate integer participant ID.",
      );

      fireEvent.change(input, { target: { value: "12" } });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Open live viewer" }));
      expect(mockPush).toHaveBeenCalledWith("/live-viewer/12");
    },
  );
});
