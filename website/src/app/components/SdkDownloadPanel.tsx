"use client";

import { useState } from "react";
import {
  getSdkLanguage,
  SDK_LANGUAGES,
  type SdkLanguage,
} from "@/shared/sdk-languages";
import styles from "../(pages)/participant/participant.module.css";

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
    <>
      <p className={styles.cardSub}>
        Choose the language for your participant and download its starter project.
      </p>

      <label className={styles.sdkLabel} htmlFor="sdk-language">
        Programming language
      </label>
      <select
        className={styles.sdkSelect}
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

      <p className={styles.sdkDescription}>{selected.description}</p>
      <button
        className={styles.sdkButton}
        type="button"
        disabled={downloading}
        onClick={download}
      >
        {downloading ? "Preparing download…" : `Download ${selected.label} SDK`}
      </button>

      <div className={styles.sdkFeedback} aria-live="polite">
        {error && <p className={styles.sdkError}>{error}</p>}
        {success && <p className={styles.sdkSuccess}>{success}</p>}
      </div>
    </>
  );
}
