export const MAX_SUBMISSION_SIZE_BYTES = 8 * 1024 * 1024;
export const SUBMISSION_ENTRYPOINT = "main.ts";
export const SUBMISSION_ENTRYPOINT_ERROR =
  "Invalid ZIP structure.\nExpected:\nagent.zip\n└── main.ts\nmain.ts must be at the top level, not inside src/ or another folder.";

export type SubmissionArchiveValidation =
  | { ok: true }
  | { ok: false; error: string; status: 413 | 415 | 422 };

// Little-endian "PK\x05\x06" signature that starts the end-of-central-directory record.
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
// Little-endian "PK\x01\x02" signature that starts each central-directory entry.
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
// Size in bytes of the end-of-central-directory record when its comment is empty.
const MIN_END_RECORD_SIZE = 22;
// Largest comment length the 16-bit comment field can declare (65535 bytes).
const MAX_ZIP_COMMENT_SIZE = 0xffff;

function zipEntryNames(buffer: ArrayBuffer): string[] | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength < MIN_END_RECORD_SIZE) return null;

  const view = new DataView(buffer);
  // The end-of-central-directory record is followed by a variable-length
  // comment, so search backwards through the largest valid record range.
  const searchStart = Math.max(
    0,
    bytes.byteLength - MIN_END_RECORD_SIZE - MAX_ZIP_COMMENT_SIZE,
  );
  let endRecord = -1;
  for (
    let offset = bytes.byteLength - MIN_END_RECORD_SIZE;
    offset >= searchStart;
    offset--
  ) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) {
      // A matching signature inside file data is not the end record unless its
      // declared comment ends exactly at the end of the archive.
      const commentLength = view.getUint16(offset + 20, true);
      if (offset + MIN_END_RECORD_SIZE + commentLength === bytes.byteLength) {
        endRecord = offset;
        break;
      }
    }
  }
  if (endRecord < 0) return null;

  // The end record locates the central directory and declares how many file
  // entries it contains.
  const diskNumber = view.getUint16(endRecord + 4, true);
  const centralDirectoryDisk = view.getUint16(endRecord + 6, true);
  const entriesOnDisk = view.getUint16(endRecord + 8, true);
  const entryCount = view.getUint16(endRecord + 10, true);
  const directorySize = view.getUint32(endRecord + 12, true);
  const directoryOffset = view.getUint32(endRecord + 16, true);

  // Multi-disk and ZIP64 archives are unnecessary for the 8 MiB upload limit.
  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff ||
    directoryOffset + directorySize > endRecord
  ) {
    return null;
  }

  const names: string[] = [];
  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index++) {
    // Each central-directory entry has a fixed 46-byte header followed by its
    // variable-length name, extra data, and comment.
    if (
      offset + 46 > endRecord ||
      view.getUint32(offset, true) !== CENTRAL_DIRECTORY_ENTRY
    ) {
      return null;
    }

    const flags = view.getUint16(offset + 8, true);
    // Bit zero of the general-purpose flag marks an encrypted entry, which the
    // submission pipeline does not support.
    if ((flags & 0x0001) !== 0) return null;

    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (nextOffset > endRecord) return null;

    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
    // The required entrypoint, main.ts, is ASCII, so a byte-wise conversion is
    // sufficient for the exact root-level filename comparison below.
    names.push(
      Array.from(nameBytes, (byte) => String.fromCharCode(byte)).join(""),
    );
    offset = nextOffset;
  }

  // Reject directories whose declared size does not match the entries parsed.
  return offset === directoryOffset + directorySize ? names : null;
}

export async function validateSubmissionArchive(
  file: File,
): Promise<SubmissionArchiveValidation> {
  if (file.size > MAX_SUBMISSION_SIZE_BYTES) {
    return {
      ok: false,
      status: 413,
      error: "The selected ZIP exceeds the 8 MiB upload limit",
    };
  }
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return { ok: false, status: 415, error: "Select a ZIP archive to upload" };
  }

  let names: string[] | null;
  try {
    names = zipEntryNames(await file.arrayBuffer());
  } catch {
    names = null;
  }
  if (!names) {
    return {
      ok: false,
      status: 415,
      error: "The selected file is not a valid ZIP archive",
    };
  }
  if (!names.includes(SUBMISSION_ENTRYPOINT)) {
    return {
      ok: false,
      status: 422,
      error: SUBMISSION_ENTRYPOINT_ERROR,
    };
  }

  return { ok: true };
}
