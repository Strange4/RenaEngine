"use client";

import { useState } from "react";
import {
  getSdkLanguage,
  SDK_LANGUAGES,
  type SdkLanguage,
} from "@/shared/sdk-languages";

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string"
    ? body.error
    : "Could not download the SDK. Please try again.";
}

function saveArchive(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export default function SdkDownloadPanel() {
  const [language, setLanguage] = useState<SdkLanguage>("typescript");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const selected = getSdkLanguage(language);

  async function download() {
    setDownloading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/downloads/${language}`);
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }

      const archive = await response.blob();
      saveArchive(archive, selected.fileName);
      setSuccess(`${selected.label} SDK download started.`);
    } catch {
      setError("Could not download the SDK. Check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="sdk-download-card" aria-labelledby="sdk-download-title">
      <h2 id="sdk-download-title">Starter SDK</h2>
      <p className="sdk-download-intro">
        Choose the language for your participant and download its starter project.
      </p>

      <label htmlFor="sdk-language">Programming language</label>
      <select
        id="sdk-language"
        value={language}
        disabled={downloading}
        onChange={(event) => {
          setLanguage(event.target.value as SdkLanguage);
          setError(null);
          setSuccess(null);
        }}
      >
        {SDK_LANGUAGES.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      <p className="sdk-language-description">{selected.description}</p>
      <button type="button" disabled={downloading} onClick={download}>
        {downloading ? "Preparing download…" : `Download ${selected.label} SDK`}
      </button>

      <div className="sdk-download-feedback" aria-live="polite">
        {error && <p className="error">{error}</p>}
        {success && <p className="hint">{success}</p>}
      </div>
    </section>
  );
}
