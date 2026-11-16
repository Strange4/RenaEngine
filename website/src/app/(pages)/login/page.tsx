import { redirect } from "next/navigation";
import { getSession } from "@/server/lib/session";
import LoginForm from "@/app/components/LoginForm";
import { homePathFor } from "@/shared/token";
import styles from "./login.module.css";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(homePathFor(session));

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <img className={styles.logo} src="/sprites/rena.png" alt="RenaEngine logo" />
          <h1 className={styles.title}>RenaEngine</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
