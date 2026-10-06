import { redirect } from "next/navigation";
import LogoutButton from "@/app/components/LogoutButton";
import { getSession } from "@/server/lib/session";

export default async function ParticipantPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "participant") redirect("/admin");

  return (
    <main>
      <h1>Participant #{session.participantId}</h1>
      <LogoutButton />
    </main>
  );
}
