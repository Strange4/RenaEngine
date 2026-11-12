import { NextResponse } from "next/server";
import { uploadSubmission } from "@/server/lib/game-server-uploads";
import { getSession } from "@/server/lib/session";
import { isAdmin } from "@/shared/token";

async function responseFile(request: Request): Promise<File | null> {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}

function upstreamError(status: number): string {
  if (status === 413) return "The selected ZIP exceeds the 8 MiB upload limit";
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

  const file = await responseFile(request);
  if (!file) {
    return NextResponse.json(
      { error: "Select a ZIP archive to upload" },
      { status: 400 },
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
