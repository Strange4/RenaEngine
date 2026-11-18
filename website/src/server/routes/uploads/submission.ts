// AI contribution: Below 50% AI-generated
import { NextResponse } from "next/server";
import { uploadSubmission } from "@/server/lib/game-server-uploads";
import { listParticipantTokens } from "@/server/lib/participant-token-store";
import { getSession } from "@/server/lib/session";
import {
  MAX_SUBMISSION_SIZE_BYTES,
  SUBMISSION_ENTRYPOINT_ERROR,
  validateSubmissionArchive,
} from "@/shared/submission-archive";
import { isAdmin } from "@/shared/token";

// Allowance for multipart framing around the archive.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const MAX_BODY_BYTES = MAX_SUBMISSION_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES;
const TOO_LARGE_ERROR = `The selected ZIP exceeds the ${MAX_SUBMISSION_SIZE_BYTES / (1024 * 1024)} MiB upload limit`;

class BodyTooLargeError extends Error {}

// Stops reading once the limit is passed, so a missing or false Content-Length cannot make the server buffer an oversized upload.
async function readBodyWithinLimit(
  body: ReadableStream<Uint8Array<ArrayBuffer>>,
  limit: number,
): Promise<Blob> {
  const reader = body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limit) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  return new Blob(chunks);
}

async function requestFile(request: Request): Promise<File | null> {
  const body = request.body
    ? await readBodyWithinLimit(request.body, MAX_BODY_BYTES)
    : new Blob();
  const formData = await new Response(body, { headers: request.headers })
    .formData()
    .catch(() => null);
  const file = formData?.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}

function upstreamError(status: number): string {
  if (status === 413) return TOO_LARGE_ERROR;
  if (status === 415) return "Select a ZIP archive to upload";
  if (status === 422) return SUBMISSION_ENTRYPOINT_ERROR;
  return "The game server could not accept the submission";
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (isAdmin(session)) {
    return NextResponse.json(
      { error: "Code uploads are available to participants only" },
      { status: 403 },
    );
  }

  // The session cookie only proves its format, so confirm the token is registered and active.
  const tokens = await listParticipantTokens();
  if (!tokens) {
    return NextResponse.json(
      { error: "Could not verify your session" },
      { status: 503 },
    );
  }
  const registered = tokens.some(
    (token) =>
      token.active &&
      token.participantId === session.participantId &&
      token.token === session.token,
  );
  if (!registered) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: TOO_LARGE_ERROR }, { status: 413 });
  }

  let file: File | null;
  try {
    file = await requestFile(request);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json({ error: TOO_LARGE_ERROR }, { status: 413 });
    }
    throw error;
  }
  if (!file) {
    return NextResponse.json(
      { error: "Select a ZIP archive to upload" },
      { status: 400 },
    );
  }
  if (file.size > MAX_SUBMISSION_SIZE_BYTES) {
    return NextResponse.json({ error: TOO_LARGE_ERROR }, { status: 413 });
  }

  const validation = await validateSubmissionArchive(file);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status },
    );
  }

  const upstream = await uploadSubmission(session.participantId, file);
  if (!upstream) {
    return NextResponse.json(
      { error: "Could not reach the game server" },
      { status: 502 },
    );
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { error: upstreamError(upstream.status) },
      { status: upstream.status },
    );
  }

  return NextResponse.json({ status: "accepted" }, { status: 202 });
}
