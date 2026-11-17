// Runs once when the Next.js server starts: the canonical place for DB init.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("@/server/lib/db");
    getDb();
  }
}
