"use client";

import { useState } from "react";

export default function FeatureToggleControl({
  initialEnabled,
}: {
  initialEnabled: boolean | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled ?? false);
  const [available, setAvailable] = useState(initialEnabled !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(
    initialEnabled === null ? "Could not read the game server setting." : null,
  );

  async function toggleFeature() {
    const requestedValue = !enabled;
    setSaving(true);
    setError(null);

    const response = await fetch("/api/settings/test-feature", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: requestedValue }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);

    if (!response?.ok || typeof body?.enabled !== "boolean") {
      setError(body?.error ?? "Could not update the feature setting.");
      setSaving(false);
      return;
    }

    setEnabled(body.enabled);
    setAvailable(true);
    setSaving(false);
  }

  return (
    <section aria-labelledby="test-feature-setting">
      <h2 id="test-feature-setting">Test feature</h2>
      <p role="status">
        Participant access: {available ? (enabled ? "Enabled" : "Disabled") : "Unavailable"}
      </p>
      {error && <p className="error">{error}</p>}
      <button type="button" onClick={toggleFeature} disabled={saving}>
        {saving ? "Saving..." : enabled ? "Disable feature" : "Enable feature"}
      </button>
    </section>
  );
}
