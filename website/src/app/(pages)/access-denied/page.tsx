import Link from "next/link";

// Basic access denied view; #54 will add the full 403 page design.
export default function AccessDeniedPage() {
  return (
    <main>
      <h1>Access Denied</h1>
      <p>You do not have permission to view this page.</p>
      <Link href="/">Go to your home page</Link>
    </main>
  );
}
