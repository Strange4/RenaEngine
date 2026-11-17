import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

function dbPath(): string {
  return process.env.DB_PATH ?? path.join(process.cwd(), "data", "rena.db");
}

const MIGRATIONS: string[] = [
  /* users table:
   * id: Internal database key only; never use it as a user reference.
   * login_id: Unique ID users enter; all application references use this value.
   * role: User permissions category; only admin and participant are allowed.
   * password_hash: Slow password-hash output; never store the plaintext password.
   */
  `CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    login_id      TEXT NOT NULL UNIQUE,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'participant')),
    password_hash TEXT NOT NULL
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
