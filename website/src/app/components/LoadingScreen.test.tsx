import { render, screen } from "@testing-library/react";
import LoadingScreen from "./LoadingScreen";

describe("LoadingScreen", () => {
  it("announces the default session message as a status", () => {
    render(<LoadingScreen />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Verifying your session…",
    );
  });

  it("shows a custom message", () => {
    render(<LoadingScreen message="Signing you in…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Signing you in…");
  });

  it("hides the decorative spinner from assistive technology", () => {
    const { container } = render(<LoadingScreen />);

    expect(container.querySelector(".loading-spinner")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
