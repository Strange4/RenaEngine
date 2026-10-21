import { PUT as updateFeature } from "@/server/routes/settings/feature";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ featureKey: string }> },
) {
  const { featureKey } = await params;
  return updateFeature(request, featureKey);
}
