import { GET as connectSSE } from "@/server/routes/viewer/sse";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> },
) {
  const { participantId } = await params;
  console.log("Connecting to SSE with id", participantId)
  return connectSSE(request, participantId);
}
