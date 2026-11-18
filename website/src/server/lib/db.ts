// No substantial AI-generated code
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { hashToken } from "./token-hash";

function dbPath(): string {
  return process.env.DB_PATH ?? path.join(process.cwd(), "data", "rena.db");
}

const MIGRATIONS: string[] = [
  /* users table:
   * id: (PK) Auto-incrementing user ID for routing, API calls, and relations.
   * token_hash: Unique SHA-256 hash of the login token (raw token not stored).
   * role: Permission level; either admin or participant (for now). 
   */
  `CREATE TABLE users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    role       TEXT NOT NULL CHECK (role IN ('admin', 'participant'))
  )`,
  
  // Seed default tokens (only runs once)
  `INSERT OR IGNORE INTO users (token_hash, role) VALUES
    ('${hashToken("ADMIN-dev")}', 'admin'),
    ('${hashToken("PARTICIPANT-1-dev")}', 'participant'),
    ('${hashToken("PARTICIPANT-2-dev")}', 'participant');`,
];

// Applies any pending migrations. user_version tracks how many have run,
// so re-running on every boot is a no-op once up to date.
// Read and update version atomically inside a transaction to prevent concurrent
// processes from both seeing version 0.
export function migrate(db: Database.Database): void {
  db.transaction(() => {
    const { user_version: version } = db
      .prepare("PRAGMA user_version")
      .get() as { user_version: number };

    for (let i = version; i < MIGRATIONS.length; i++) {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
    }
  }).immediate();
}

let db: Database.Database | null = null;

// Returns the shared database connection, creating and migrating it on first use.
// Build in a local variable and only assign once fully initialized to prevent
// returning a partially-initialized connection if migration fails.
export function getDb(): Database.Database {
  if (db) return db;

  const file = dbPath();
  mkdirSync(path.dirname(file), { recursive: true });
  const newDb = new Database(file);
  newDb.pragma("journal_mode = WAL");
  migrate(newDb);
  db = newDb;
  return db;
}
