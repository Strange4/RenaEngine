import { createReadableStream } from "@/server/lib/live-viewer";
import { getSession } from "@/server/lib/session";
import { isAdmin } from "@/shared/token";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest ,participantId: string) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isAdmin(session) && session.participantId.toString() != participantId) {
    return NextResponse.json(
      {
        error:
          "You can only view live sessions if you are an admin or it is your own session",
      },
      { status: 403 },
    );
  }

  let id: number;

  if (isAdmin(session)) {
    id = Number.parseInt(participantId);

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid participantId" },
        { status: 400 },
      );
    }
  } else {
    id = session.participantId;
  }
  const stream = await createReadableStream(id, request.signal);;

  if (!stream) {
    return NextResponse.json(
      { error: "Could not reach the game server" },
      { status: 502 },
    );
  }

  return new Response(stream, {
    headers: new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    }),
  });
}
