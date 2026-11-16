import {
  formatLastSubmission,
  formatTokenStatus,
  sortParticipantTokens,
  type ParticipantToken,
} from "./participant-tokens";

function token(overrides: Partial<ParticipantToken>): ParticipantToken {
  return {
    participantId: 1,
    token: "PARTICIPANT-1-secret",
    active: true,
    lastSubmissionAt: null,
    ...overrides,
  };
}

describe("sortParticipantTokens", () => {
  it("orders tokens by participant number without changing the input", () => {
    const tokens = [
      token({ participantId: 10 }),
      token({ participantId: 2 }),
      token({ participantId: 7 }),
    ];

    expect(sortParticipantTokens(tokens).map((t) => t.participantId)).toEqual([
      2, 7, 10,
    ]);
    expect(tokens.map((t) => t.participantId)).toEqual([10, 2, 7]);
  });
});

describe("formatTokenStatus", () => {
  it("labels active and inactive tokens", () => {
    expect(formatTokenStatus(token({ active: true }))).toBe("Active");
    expect(formatTokenStatus(token({ active: false }))).toBe("Inactive");
  });
});

describe("formatLastSubmission", () => {
  it("shows Never when the participant has not submitted", () => {
    expect(formatLastSubmission(null)).toBe("Never");
  });

  it("shows Unknown for an unreadable date", () => {
    expect(formatLastSubmission("not-a-date")).toBe("Unknown");
  });

  it("formats a valid timestamp as a date and time", () => {
    const formatted = formatLastSubmission("2026-10-20T14:30:00Z", "en-CA");

    expect(formatted).toMatch(/2026/);
    expect(formatted).not.toBe("Unknown");
  });
});
