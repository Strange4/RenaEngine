import { GET as downloadSdk } from "@/server/routes/downloads/sdk";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ language: string }> },
) {
  const { language } = await params;
  return downloadSdk(language);
}
