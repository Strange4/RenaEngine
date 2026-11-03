import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

function dbPath(): string {
  return process.env.DB_PATH ?? path.join(process.cwd(), "data", "rena.db");
}

// Migration v1: the users table. token_hash is the SHA-256 hex of the token;
// plaintext tokens are never stored. users.id doubles as the participant number.
const MIGRATIONS: string[] = [
  `CREATE TABLE users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    role       TEXT NOT NULL CHECK (role IN ('admin', 'participant')),
    token_hash TEXT NOT NULL UNIQUE,
    active     INTEGER NOT NULL DEFAULT 1
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
