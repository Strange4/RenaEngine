import { render, screen } from "@testing-library/react";
import AccessDeniedPage from "./page";

describe("AccessDeniedPage", () => {
  it("explains the denial and links back to the home page", () => {
    render(<AccessDeniedPage />);

    expect(
      screen.getByRole("heading", { name: "Access Denied" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to your home page" }),
    ).toHaveAttribute("href", "/");
  });
});
