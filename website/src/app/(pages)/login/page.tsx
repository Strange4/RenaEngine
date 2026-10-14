import { redirect } from "next/navigation";
import { getSession } from "@/server/lib/session";
import LoginForm from "@/app/components/LoginForm";
import { homePathFor } from "@/shared/token";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(homePathFor(session));

  return (
    <main>
      <h1>RenaEngine</h1>
      <LoginForm />
    </main>
  );
}
