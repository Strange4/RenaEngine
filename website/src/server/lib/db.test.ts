import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrate } from "./db";

describe("migrate", () => {
  let dir: string;
  let db: Database.Database;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "rena-db-test-"));
    db = new Database(path.join(dir, "test.db"));
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the users table with the expected columns", () => {
    migrate(db);

    const columns = db
      .prepare("PRAGMA table_info(users)")
      .all() as { name: string; type: string; notnull: number }[];
    const byName = Object.fromEntries(columns.map((c) => [c.name, c]));

    expect(Object.keys(byName)).toEqual(["id", "role", "token_hash", "active"]);
    expect(byName.id.type).toBe("INTEGER");
    expect(byName.role.notnull).toBe(1);
    expect(byName.token_hash.notnull).toBe(1);
    expect(byName.active.notnull).toBe(1);
  });

  it("enforces the role check constraint", () => {
    migrate(db);

    const insert = db.prepare(
      "INSERT INTO users (role, token_hash) VALUES (?, ?)",
    );
    expect(() => insert.run("admin", "hash-1")).not.toThrow();
    expect(() => insert.run("participant", "hash-2")).not.toThrow();
    expect(() => insert.run("superuser", "hash-3")).toThrow();
  });

  it("enforces unique token hashes", () => {
    migrate(db);

    const insert = db.prepare(
      "INSERT INTO users (role, token_hash) VALUES (?, ?)",
    );
    insert.run("participant", "same-hash");
    expect(() => insert.run("participant", "same-hash")).toThrow();
  });

  it("defaults new users to active", () => {
    migrate(db);

    db.prepare("INSERT INTO users (role, token_hash) VALUES (?, ?)").run(
      "participant",
      "hash-active",
    );
    const row = db
      .prepare("SELECT active FROM users WHERE token_hash = ?")
      .get("hash-active") as { active: number };
    expect(row.active).toBe(1);
  });

  it("auto-increments ids and never reuses them", () => {
    migrate(db);

    const insert = db.prepare(
      "INSERT INTO users (role, token_hash) VALUES (?, ?)",
    );
    const first = insert.run("participant", "hash-a").lastInsertRowid;
    insert.run("participant", "hash-b");
    db.prepare("DELETE FROM users WHERE id = ?").run(
      insert.run("participant", "hash-c").lastInsertRowid,
    );
    const fourth = insert.run("participant", "hash-d").lastInsertRowid;

    expect(first).toBe(1);
    expect(fourth).toBe(4);
  });

  it("is idempotent across runs", () => {
    migrate(db);
    db.prepare("INSERT INTO users (role, token_hash) VALUES (?, ?)").run(
      "admin",
      "hash-keep",
    );

    expect(() => migrate(db)).not.toThrow();

    const { user_version: version } = db
      .prepare("PRAGMA user_version")
      .get() as { user_version: number };
    expect(version).toBe(1);

    const count = db
      .prepare("SELECT COUNT(*) AS count FROM users")
      .get() as { count: number };
    expect(count.count).toBe(1);
  });
});
