"use client";

import { useState } from "react";
import type { FeatureDefinition } from "@/shared/features";
import styles from "./FeatureToggleControl.module.css";
import switchStyles from "./Switch.module.css";

export default function FeatureToggleControl({
  feature,
  initialEnabled,
}: {
  feature: FeatureDefinition;
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

    const response = await fetch(`/api/settings/features/${feature.key}`, {
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
    <section className={styles.control} aria-labelledby={`${feature.key}-setting`}>
      <div>
        <h3 id={`${feature.key}-setting`}>{feature.label}</h3>
        <p role="status">
          Participant access: {available ? (enabled ? "Enabled" : "Disabled") : "Unavailable"}
          {saving && " (Saving...)"}
        </p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      <button
        className={switchStyles.switch}
        type="button"
        role="switch"
        aria-label={feature.label}
        aria-checked={enabled}
        onClick={toggleFeature}
        disabled={saving}
      />
    </section>
  );
}
