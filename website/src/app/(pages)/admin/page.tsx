import { redirect } from "next/navigation";
import LogoutButton from "@/app/components/LogoutButton";
import { getSession } from "@/server/lib/session";
import { isAdmin } from "@/shared/token";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/access-denied");

  return (
    <main>
      <h1>Admin</h1>
      <LogoutButton />
    </main>
  );
}
