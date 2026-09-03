import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(__dirname, "..", "..", "data");

try {
  fs.mkdirSync(dataDir, { recursive: true });
  const probeFile = path.join(dataDir, ".write-test");
  fs.writeFileSync(probeFile, "ok");
  fs.unlinkSync(probeFile);
} catch (err) {
  console.error("=".repeat(60));
  console.error(` Nem lehet írni az adatkönyvtárba: ${dataDir}`);
  console.error(` Ok: ${(err as NodeJS.ErrnoException).code} - ${(err as Error).message}`);
  console.error(
    " Ez a Docker volume/mount jogosultsági beállítása - nem az alkalmazás kódja."
  );
  console.error("=".repeat(60));
  throw err;
}

export const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    nickname TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'user')),
    must_change_password INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    business TEXT,
    phone TEXT,
    email TEXT,
    note TEXT,
    stage TEXT NOT NULL CHECK (stage IN ('potential', 'discussion', 'building', 'done')) DEFAULT 'potential',
    priority INTEGER CHECK (priority BETWEEN 1 AND 5),
    motivation INTEGER CHECK (motivation BETWEEN 1 AND 5),
    position INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    stage TEXT NOT NULL CHECK (stage IN ('backlog', 'todo', 'in_progress', 'blocked', 'waiting_review', 'done', 'closed')) DEFAULT 'backlog',
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
  );

  CREATE INDEX IF NOT EXISTS idx_customers_stage ON customers(stage);
  CREATE INDEX IF NOT EXISTS idx_comments_customer ON comments(customer_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_stage ON tasks(stage);
`);

// Migration: `business` column and `name` becoming nullable were added
// after the initial release - existing databases need catching up.
type ColumnInfo = { name: string; notnull: number };
let customerColumns = db
  .prepare("PRAGMA table_info(customers)")
  .all() as ColumnInfo[];

if (!customerColumns.some((c) => c.name === "business")) {
  db.exec("ALTER TABLE customers ADD COLUMN business TEXT");
  customerColumns = db.prepare("PRAGMA table_info(customers)").all() as ColumnInfo[];
}

const nameColumn = customerColumns.find((c) => c.name === "name");
if (nameColumn?.notnull) {
  // SQLite can't drop a NOT NULL constraint in place - rebuild the table.
  db.exec(`
    CREATE TABLE customers_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      business TEXT,
      phone TEXT,
      email TEXT,
      note TEXT,
      stage TEXT NOT NULL CHECK (stage IN ('potential', 'discussion', 'building', 'done')) DEFAULT 'potential',
      priority INTEGER CHECK (priority BETWEEN 1 AND 5),
      motivation INTEGER CHECK (motivation BETWEEN 1 AND 5),
      position INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO customers_new SELECT id, name, business, phone, email, note, stage, priority, motivation, position, created_by, created_at, updated_at FROM customers;
    DROP TABLE customers;
    ALTER TABLE customers_new RENAME TO customers;
    CREATE INDEX IF NOT EXISTS idx_customers_stage ON customers(stage);
  `);
}

// Migration: `avatar` column added to users after the initial release.
const userColumns = db.prepare("PRAGMA table_info(users)").all() as ColumnInfo[];
if (!userColumns.some((c) => c.name === "avatar")) {
  db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
}
