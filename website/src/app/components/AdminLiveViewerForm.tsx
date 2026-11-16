"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./AdminLiveViewerForm.module.css";

// Lets admins open the live viewer for a participant by entering their ID.
// NOTE: This'll be replaced soon with a more robust admin interface.
export default function AdminLiveViewerForm() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [error, setError] = useState(false);

  // Validates the participant ID as a safe integer before navigating to its viewer.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = Number(participantId);
    if (!/^[+-]?\d+$/.test(participantId) || !Number.isSafeInteger(id)) {
      setError(true);
      return;
    }

    router.push(`/live-viewer/${id}`);
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label htmlFor="live-viewer-participant-id">Participant ID</label>
      <input
        id="live-viewer-participant-id"
        type="text"
        value={participantId}
        aria-invalid={error}
        aria-describedby={error ? "live-viewer-id-error" : undefined}
        onChange={(event) => {
          setParticipantId(event.target.value);
          setError(false);
        }}
      />
      {error && (
        <p id="live-viewer-id-error" className={styles.error} role="alert">
          Enter an appropriate integer participant ID.
        </p>
      )}
      <button type="submit">Open live viewer</button>
    </form>
  );
}
