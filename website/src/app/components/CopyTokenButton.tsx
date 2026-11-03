"use client";

import { useEffect, useRef, useState } from "react";

const MESSAGE_DURATION_MS = 2000;

type CopyState = "idle" | "copied" | "failed";

export default function CopyTokenButton({
  token,
  participantId,
}: {
  token: string;
  participantId: number;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function copyToken() {
    const copied = await navigator.clipboard
      ?.writeText(token)
      .then(() => true)
      .catch(() => false);
    setState(copied ? "copied" : "failed");

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState("idle"), MESSAGE_DURATION_MS);
  }

  return (
    <span className="copy-token">
      <button
        type="button"
        onClick={copyToken}
        aria-label={`Copy token for participant ${participantId}`}
      >
        Copy
      </button>
      <span role="status" className={state === "failed" ? "error" : "hint"}>
        {state === "copied" && "Copied!"}
        {state === "failed" && "Copy failed"}
      </span>
    </span>
  );
}
