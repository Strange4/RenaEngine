"use client";

import { useRef, useState, type FormEvent } from "react";

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string"
    ? body.error
    : "Could not upload the submission. Please try again.";
}

export default function CodeUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }

      setSuccess(`${file.name} was uploaded successfully.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError(
        "Could not upload the submission. Check your connection and try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="code-upload-card" aria-labelledby="code-upload-title">
      <h2 id="code-upload-title">Upload submission</h2>
      <p className="code-upload-intro">
        Upload your completed participant project as a ZIP archive.
      </p>

      <form onSubmit={upload}>
        <label htmlFor="submission-file">Project archive</label>
        <input
          ref={inputRef}
          id="submission-file"
          name="file"
          type="file"
          accept=".zip,application/zip,application/x-zip,application/x-zip-compressed"
          disabled={uploading}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError(null);
            setSuccess(null);
          }}
        />
        <p className="code-upload-description">
          ZIP files up to 8 MiB are accepted. A new upload replaces your previous
          submission.
        </p>
        <button type="submit" disabled={!file || uploading}>
          {uploading ? "Uploading…" : "Upload submission"}
        </button>
      </form>

      <div className="code-upload-feedback" aria-live="polite">
        {error && <p className="error">{error}</p>}
        {success && <p className="hint">{success}</p>}
      </div>
    </section>
  );
}
