import { render, screen, within } from "@testing-library/react";
import ParticipantTokenTable from "./ParticipantTokenTable";

describe("ParticipantTokenTable", () => {
  it("lists participants in order", () => {
    render(<ParticipantTokenTable participantIds={[12, 3]} />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getByRole("rowheader").textContent)).toEqual([
      "#3",
      "#12",
    ]);
  });

  it("never shows token strings or copy buttons", () => {
    render(<ParticipantTokenTable participantIds={[3]} />);

    expect(screen.queryByText(/PARTICIPANT-/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no participants", () => {
    render(<ParticipantTokenTable participantIds={[]} />);

    expect(
      screen.getByText("No participant tokens have been created yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
