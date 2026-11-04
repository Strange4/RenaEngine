import { NextResponse } from "next/server";
import { fetchSdkArchive } from "@/server/lib/game-server-downloads";
import { getFeatureSetting } from "@/server/lib/game-server-settings";
import { getSession } from "@/server/lib/session";
import { SDK_DOWNLOADS_FEATURE } from "@/shared/features";
import {
  getSdkLanguage,
  isSdkLanguage,
} from "@/shared/sdk-languages";
import { isAdmin } from "@/shared/token";

export async function GET(language: string) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (isAdmin(session)) {
    return NextResponse.json(
      { error: "SDK downloads are available to participants only" },
      { status: 403 },
    );
  }
  if (!isSdkLanguage(language)) {
    return NextResponse.json({ error: "Unknown SDK language" }, { status: 404 });
  }

  const feature = await getFeatureSetting(SDK_DOWNLOADS_FEATURE.key);
  if (!feature?.enabled) {
    return NextResponse.json(
      { error: "Starter SDK downloads are currently disabled" },
      { status: 403 },
    );
  }

  const definition = getSdkLanguage(language);
  const upstream = await fetchSdkArchive(language);
  if (!upstream) {
    return NextResponse.json(
      { error: "Could not reach the game server" },
      { status: 502 },
    );
  }
  if (!upstream.ok) {
    const error =
      upstream.status === 404
        ? `${definition.label} SDK is not available on the game server`
        : `The game server could not provide the ${definition.label} SDK`;
    return NextResponse.json({ error }, { status: upstream.status });
  }
  if (!upstream.body) {
    return NextResponse.json(
      { error: "The game server returned an empty SDK archive" },
      { status: 502 },
    );
  }

  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename="${definition.fileName}"`,
    "Content-Type": upstream.headers.get("Content-Type") ?? "application/zip",
    "X-Content-Type-Options": "nosniff",
  });
  const contentLength = upstream.headers.get("Content-Length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new Response(upstream.body, { status: 200, headers });
}
