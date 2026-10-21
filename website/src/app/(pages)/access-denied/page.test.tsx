import { fireEvent, render, screen } from "@testing-library/react";
import AccessDeniedPage from "./page";

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

function setReferrer(referrer: string) {
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value: referrer,
  });
}

beforeEach(() => {
  mockBack.mockReset();
  mockPush.mockReset();
  setReferrer("");
});

describe("AccessDeniedPage", () => {
  it("explains the denial and provides a home-page link", () => {
    const { container } = render(<AccessDeniedPage />);

    expect(
      screen.getByRole("heading", { name: "Access Denied" }),
    ).toBeInTheDocument();
    expect(screen.getByText("403 · Forbidden")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to your home page" }),
    ).toHaveAttribute("href", "/");
    expect(container.querySelector("main")).toHaveClass("access-denied-page");
  });

  it("returns to a same-origin previous page", () => {
    setReferrer("http://localhost/participant");
    render(<AccessDeniedPage />);

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([
    ["an external referrer", "https://example.com/"],
    ["no referrer", ""],
  ])("uses the home page as a safe fallback for %s", (_description, referrer) => {
    setReferrer(referrer);
    render(<AccessDeniedPage />);

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
