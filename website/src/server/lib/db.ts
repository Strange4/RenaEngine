import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

function dbPath(): string {
  return process.env.DB_PATH ?? path.join(process.cwd(), "data", "rena.db");
}

const MIGRATIONS: string[] = [
  /* users table:
   * id: Auto-incrementing user ID for routing, API context, and relations.
   * token: Unique login credential for admins and participants.
   * role: Permission level; either admin or participant.
   */
  `CREATE TABLE users (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    role  TEXT NOT NULL CHECK (role IN ('admin', 'participant'))
  )`,
];

// Applies any pending migrations. user_version tracks how many have run,
// so re-running on every boot is a no-op once up to date.
export function migrate(db: Database.Database): void {
  const { user_version: version } = db
    .prepare("PRAGMA user_version")
    .get() as { user_version: number };

  for (let i = version; i < MIGRATIONS.length; i++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
    })();
  }
}

let db: Database.Database | null = null;

// Returns the shared database connection, creating and migrating it on first use.
export function getDb(): Database.Database {
  if (db) return db;

  const file = dbPath();
  mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}
