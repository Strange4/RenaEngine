import { POST as uploadSubmission } from "@/server/routes/uploads/submission";

export async function POST(request: Request) {
  return uploadSubmission(request);
}
