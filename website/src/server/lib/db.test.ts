// 50% or more AI-generated code
import Database from "better-sqlite3";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
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

  it("creates the users table with the expected token columns", () => {
    migrate(db);

    const columns = db
      .prepare("PRAGMA table_info(users)")
      .all() as { name: string; type: string; notnull: number }[];
    const byName = Object.fromEntries(columns.map((c) => [c.name, c]));

    expect(Object.keys(byName)).toEqual(["id", "token_hash", "role"]);
    expect(byName.id.type).toBe("INTEGER");
    expect(byName.token_hash.type).toBe("TEXT");
    expect(byName.token_hash.notnull).toBe(1);
    expect(byName.role.notnull).toBe(1);
  });

  it("enforces the role check constraint", () => {
    migrate(db);

    const insert = db.prepare(
      "INSERT INTO users (token_hash, role) VALUES (?, ?)",
    );
    expect(() => insert.run("hash-1", "admin")).not.toThrow();
    expect(() => insert.run("hash-2", "participant")).not.toThrow();
    expect(() => insert.run("hash-3", "superuser")).toThrow();
  });

  it("enforces unique token hashes across roles", () => {
    migrate(db);

    const insert = db.prepare(
      "INSERT INTO users (token_hash, role) VALUES (?, ?)",
    );
    insert.run("same-hash", "participant");
    expect(() => insert.run("same-hash", "admin")).toThrow();
  });

  it("auto-increments ids and never reuses them", () => {
    migrate(db);

    const insert = db.prepare(
      "INSERT INTO users (token_hash, role) VALUES (?, ?)",
    );
    const first = insert.run("hash-a", "participant").lastInsertRowid;
    insert.run("hash-b", "participant");
    db.prepare("DELETE FROM users WHERE id = ?").run(
      insert.run("hash-c", "participant").lastInsertRowid,
    );
    const fourth = insert.run("hash-d", "participant").lastInsertRowid;

    expect(first).toBe(1);
    expect(fourth).toBe(4);
  });

  it("is idempotent across runs", () => {
    migrate(db);
    db.prepare(
      "INSERT INTO users (token_hash, role) VALUES (?, ?)",
    ).run("hash-keep", "admin");

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

describe("getDb", () => {
  let dir: string;
  let db: Database.Database | undefined;
  let dbFile: string;
  let originalDbPath: string | undefined;

  beforeEach(() => {
    jest.resetModules();
    dir = mkdtempSync(path.join(tmpdir(), "rena-getdb-test-"));
    dbFile = path.join(dir, "nested", "rena.db");
    originalDbPath = process.env.DB_PATH;
    process.env.DB_PATH = dbFile;
  });

  afterEach(() => {
    db?.close();
    if (originalDbPath === undefined) {
      delete process.env.DB_PATH;
    } else {
      process.env.DB_PATH = originalDbPath;
    }
    rmSync(dir, { recursive: true, force: true });
    jest.resetModules();
  });

  it("creates the file, applies migrations and reuses the connection", async () => {
    const { getDb } = await import("./db");
    db = getDb();

    expect(existsSync(dbFile)).toBe(true);
    expect(db.pragma("user_version", { simple: true })).toBe(1);
    expect(db.pragma("journal_mode", { simple: true })).toBe("wal");
    const columns = db
      .prepare("PRAGMA table_info(users)")
      .all() as { name: string }[];
    expect(
      columns.map((column) => column.name),
    ).toEqual(["id", "token_hash", "role"]);
    expect(getDb()).toBe(db);
  });
});
