import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/participant");

  return (
    <main>
      <h1>Admin</h1>
      <LogoutButton />
    </main>
  );
}
