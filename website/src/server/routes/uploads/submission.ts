import { NextResponse } from "next/server";
import { uploadSubmission } from "@/server/lib/game-server-uploads";
import { getSession } from "@/server/lib/session";
import { isAdmin } from "@/shared/token";

// Must match the game server's MaxZipFileSizeBytes default.
const MAX_ZIP_BYTES = 8 * 1024 * 1024;
// Allowance for multipart framing around the archive.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const TOO_LARGE_ERROR = `The selected ZIP exceeds the ${MAX_ZIP_BYTES / (1024 * 1024)} MiB upload limit`;

async function requestFile(request: Request): Promise<File | null> {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}

function upstreamError(status: number): string {
  if (status === 413) return TOO_LARGE_ERROR;
  if (status === 415) return "Select a ZIP archive to upload";
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

  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_ZIP_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json({ error: TOO_LARGE_ERROR }, { status: 413 });
  }

  const file = await requestFile(request);
  if (!file) {
    return NextResponse.json(
      { error: "Select a ZIP archive to upload" },
      { status: 400 },
    );
  }
  if (file.size > MAX_ZIP_BYTES) {
    return NextResponse.json({ error: TOO_LARGE_ERROR }, { status: 413 });
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
