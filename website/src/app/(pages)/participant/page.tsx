import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/app/components/LogoutButton";
import { getSession } from "@/server/lib/session";
import { isAdmin } from "@/shared/token";

export default async function ParticipantPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isAdmin(session)) redirect("/admin");

  return (
    <main>
      <h1>Participant #{session.participantId}</h1>
      <p>
        <Link href="/test-feature">Open test feature</Link>
      </p>
      <LogoutButton />
    </main>
  );
}
