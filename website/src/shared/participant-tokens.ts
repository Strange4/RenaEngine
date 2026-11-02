export type ParticipantToken = {
  participantId: number;
  token: string;
  active: boolean;
  // ISO 8601 timestamp, or null when the participant has never submitted code.
  lastSubmissionAt: string | null;
};

// Returns a copy of the tokens ordered by participant number.
export function sortParticipantTokens(
  tokens: readonly ParticipantToken[],
): ParticipantToken[] {
  return [...tokens].sort((a, b) => a.participantId - b.participantId);
}

export function formatTokenStatus(token: ParticipantToken): string {
  return token.active ? "Active" : "Inactive";
}

export function formatLastSubmission(
  lastSubmissionAt: string | null,
  locale?: string,
): string {
  if (!lastSubmissionAt) return "Never";
  const date = new Date(lastSubmissionAt);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Shown instead of a hidden token. Fixed length so it does not hint at the real one.
export const MASKED_TOKEN = "••••••••••••";
