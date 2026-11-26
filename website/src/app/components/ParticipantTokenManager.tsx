// AI contribution: Below 50% AI-generated
"use client";

import { useEffect, useRef, useState } from "react";
import CopyTokenButton from "./CopyTokenButton";
import ParticipantTokenTable from "./ParticipantTokenTable";

type CreatedParticipant = { participantId: number; token: string };

function isCreatedParticipant(value: unknown): value is CreatedParticipant {
  const body = value as Partial<CreatedParticipant> | null;
  return typeof body?.participantId === "number" && typeof body.token === "string";
}

export default function ParticipantTokenManager({
  initialParticipantIds,
}: {
  initialParticipantIds: readonly number[];
}) {
  const [participantIds, setParticipantIds] = useState(initialParticipantIds);
  const [created, setCreated] = useState<CreatedParticipant | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open as a modal once there is a token to show, so focus moves into the
  // dialog and the rest of the page is inert until it is closed.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (created && dialog && !dialog.open) dialog.showModal();
  }, [created]);

  async function generateToken() {
    setGenerating(true);
    setError(null);
    const response = await fetch("/api/admin/tokens", { method: "POST" }).catch(
      () => null,
    );
    const body = await response?.json().catch(() => null);
    setGenerating(false);

    if (!response?.ok || !isCreatedParticipant(body)) {
      setError(body?.error ?? "Could not generate a token");
      return;
    }
    setParticipantIds((ids) => [...ids, body.participantId]);
    setCreated(body);
  }

  return (
    <>
      <div className="token-actions">
        <button type="button" onClick={generateToken} disabled={generating}>
          {generating ? "Generating…" : "Generate token"}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
      <ParticipantTokenTable participantIds={participantIds} />
      <dialog
        ref={dialogRef}
        className="token-dialog"
        aria-labelledby="token-dialog-title"
        // Drop the plaintext token from state as soon as the dialog closes,
        // whether through the button or the Escape key.
        onClose={() => setCreated(null)}
      >
        {created && (
          <>
            <h3 id="token-dialog-title">
              Token for participant #{created.participantId}
            </h3>
            <p className="token-dialog-warning">
              Copy this token now and send it to the participant. It will not
              be shown again.
            </p>
            <div className="token-dialog-value">
              <code>{created.token}</code>
              <CopyTokenButton
                token={created.token}
                participantId={created.participantId}
              />
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()}>
              Done
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
