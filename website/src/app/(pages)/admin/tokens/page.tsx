import Link from "next/link";
import { redirect } from "next/navigation";
import ParticipantTokenTable from "@/app/components/ParticipantTokenTable";
import { listParticipantTokens } from "@/server/lib/participant-token-store";
import { getSession } from "@/server/lib/session";
import { isAdmin } from "@/shared/token";

export default async function AdminTokensPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/access-denied");
  const tokens = await listParticipantTokens();

  return (
    <main className="token-page">
      <p>
        <Link href="/admin">Back to admin</Link>
      </p>
      <h1>Participant Tokens</h1>
      {tokens ? (
        <ParticipantTokenTable tokens={tokens} />
      ) : (
        <p className="error">Could not load the participant tokens.</p>
      )}
    </main>
  );
}
