import { fireEvent, render, screen, within } from "@testing-library/react";
import ParticipantTokenTable from "./ParticipantTokenTable";
import { MASKED_TOKEN, type ParticipantToken } from "@/shared/participant-tokens";

const tokens: ParticipantToken[] = [
  {
    participantId: 12,
    token: "PARTICIPANT-12-beta",
    active: false,
    lastSubmissionAt: null,
  },
  {
    participantId: 3,
    token: "PARTICIPANT-3-alpha",
    active: true,
    lastSubmissionAt: "2026-10-20T14:30:00Z",
  },
];

describe("ParticipantTokenTable", () => {
  it("lists participants in order with their status and last submission", () => {
    render(<ParticipantTokenTable tokens={tokens} />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getByRole("rowheader").textContent)).toEqual([
      "#3",
      "#12",
    ]);
    expect(within(rows[0]).getByText("Active")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Inactive")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Never")).toBeInTheDocument();
  });

  it("hides token strings until the reveal switch is turned on", () => {
    render(<ParticipantTokenTable tokens={tokens} />);

    expect(screen.queryByText("PARTICIPANT-3-alpha")).not.toBeInTheDocument();
    expect(screen.getAllByText(MASKED_TOKEN)).toHaveLength(2);

    fireEvent.click(screen.getByRole("switch", { name: "Show tokens" }));

    expect(screen.getByText("PARTICIPANT-3-alpha")).toBeInTheDocument();
    expect(screen.getByText("PARTICIPANT-12-beta")).toBeInTheDocument();
    expect(screen.queryByText(MASKED_TOKEN)).not.toBeInTheDocument();
  });

  it("gives each row a copy button", () => {
    render(<ParticipantTokenTable tokens={tokens} />);

    expect(
      screen.getByRole("button", { name: "Copy token for participant 3" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy token for participant 12" }),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no tokens", () => {
    render(<ParticipantTokenTable tokens={[]} />);

    expect(
      screen.getByText("No participant tokens have been created yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
