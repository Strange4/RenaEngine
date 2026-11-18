"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { validateSubmissionArchive } from "@/shared/submission-archive";
import styles from "../(pages)/participant/participant.module.css";
import uploadStyles from "./CodeUploadPanel.module.css";

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string"
    ? body.error
    : "Could not upload the submission. Please try again.";
}

export default function CodeUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const validationId = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Validates the chosen file and keeps it as the pending upload, or shows the
  // validation error. Results from superseded selections are ignored.
  const selectFile = useCallback(async (selected: File | null) => {
    const currentValidation = ++validationId.current;
    setFile(null);
    setError(null);
    setSuccess(null);
    if (!selected) return;

    setValidating(true);
    const validation = await validateSubmissionArchive(selected);
    if (currentValidation !== validationId.current) return;

    setValidating(false);
    if (!validation.ok) {
      setError(validation.error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(selected);
  }, []);

  // Handles a file dropped on the dropzone by validating it like a picked file.
  function dropFile(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (uploading || validating) return;
    void selectFile(event.dataTransfer.files[0] ?? null);
  }

  // Posts the pending file to /api/upload and shows either the success message
  // or the error returned by the server.
  const upload = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
    },
    [file],
  );

  return (
    <section className={styles.card} aria-labelledby="code-upload-title">
      <h2 className={styles.cardTitle} id="code-upload-title">
        Upload submission
      </h2>
      <p className={styles.cardSub}>
        Upload your completed participant project as a ZIP archive.
      </p>

      <form onSubmit={upload}>
        <label
          className={`${uploadStyles.uploadDropzone} ${dragging ? uploadStyles.uploadDropzoneActive : ""}`}
          htmlFor="submission-file"
          onDragEnter={(event) => {
            event.preventDefault();
            if (!uploading && !validating) setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDragging(false);
            }
          }}
          onDrop={dropFile}
        >
          <span className={uploadStyles.uploadLabel}>Project archive</span>
          <span className={uploadStyles.uploadDropzoneText}>
            Drop a ZIP archive here or select a file
          </span>
          <input
            className={uploadStyles.uploadInput}
            ref={inputRef}
            id="submission-file"
            name="file"
            aria-label="Project archive"
            type="file"
            accept=".zip,application/zip,application/x-zip,application/x-zip-compressed"
            disabled={uploading || validating}
            onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {file && <p className={uploadStyles.uploadSelection}>Selected: {file.name}</p>}
        <p className={uploadStyles.uploadDescription}>
          ZIP files up to 8 MiB are accepted. A new upload replaces your previous
          submission.
        </p>
        <button
          className={uploadStyles.uploadButton}
          type="submit"
          disabled={!file || uploading || validating}
        >
          {validating
            ? "Validating…"
            : uploading
              ? "Uploading…"
              : "Upload submission"}
        </button>
      </form>

      <div className={uploadStyles.uploadFeedback} aria-live="polite">
        {error && <p className={uploadStyles.uploadError}>{error}</p>}
        {success && <p className={uploadStyles.uploadSuccess}>{success}</p>}
      </div>
    </section>
  );
}
