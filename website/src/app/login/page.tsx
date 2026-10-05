import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/admin" : "/participant");

  return (
    <main>
      <h1>RenaEngine</h1>
      <LoginForm />
    </main>
  );
}
