import { redirect } from "next/navigation";
import { getSession } from "@/server/lib/session";
import { homePathFor } from "@/shared/token";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(homePathFor(session));
}
