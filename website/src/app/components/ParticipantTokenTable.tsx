"use client";

import { useState } from "react";
import CopyTokenButton from "./CopyTokenButton";
import {
  MASKED_TOKEN,
  formatLastSubmission,
  formatTokenStatus,
  sortParticipantTokens,
  type ParticipantToken,
} from "@/shared/participant-tokens";

export default function ParticipantTokenTable({
  tokens,
}: {
  tokens: readonly ParticipantToken[];
}) {
  const [showTokens, setShowTokens] = useState(false);
  const rows = sortParticipantTokens(tokens);

  if (rows.length === 0) {
    return <p>No participant tokens have been created yet.</p>;
  }

  return (
    <>
      <label className="token-reveal">
        <input
          type="checkbox"
          role="switch"
          checked={showTokens}
          onChange={(event) => setShowTokens(event.target.checked)}
        />
        Show tokens
      </label>
      <div className="token-table-wrapper">
        <table className="token-table">
          <caption>Participant tokens</caption>
          <thead>
            <tr>
              <th scope="col">Participant</th>
              <th scope="col">Status</th>
              <th scope="col">Last submission</th>
              <th scope="col">Token</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.participantId}>
                <th scope="row">#{row.participantId}</th>
                <td>
                  <span
                    className={`token-status ${row.active ? "token-status-active" : "token-status-inactive"}`}
                  >
                    {formatTokenStatus(row)}
                  </span>
                </td>
                <td>{formatLastSubmission(row.lastSubmissionAt)}</td>
                <td className="token-cell">
                  <code>{showTokens ? row.token : MASKED_TOKEN}</code>
                  <CopyTokenButton
                    token={row.token}
                    participantId={row.participantId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
