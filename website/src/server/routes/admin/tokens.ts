import { NextResponse } from "next/server";
import { getSession } from "@/server/lib/session";
import { createParticipant } from "@/server/lib/user-store";
import { isAdmin } from "@/shared/token";

// Creates a participant and returns its token. This response is the only
// time the plaintext token is available, since only its hash is stored.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const participant = createParticipant();
    return NextResponse.json(participant, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Could not create a participant token", error);
    return NextResponse.json(
      { error: "Could not create a participant token" },
      { status: 500 },
    );
  }
}
