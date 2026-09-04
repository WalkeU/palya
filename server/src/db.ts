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
    highlighted INTEGER NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#d99a3d',
    poll_type TEXT CHECK (poll_type IN ('single', 'multiple')),
    position INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS poll_votes (
    option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (option_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_customers_stage ON customers(stage);
  CREATE INDEX IF NOT EXISTS idx_comments_customer ON comments(customer_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_stage ON tasks(stage);
  CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
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

// Migration: `closed_reason` lets a customer be taken off the active board
// (not interested / deal fell through) without deleting their history.
customerColumns = db.prepare("PRAGMA table_info(customers)").all() as ColumnInfo[];
if (!customerColumns.some((c) => c.name === "closed_reason")) {
  db.exec(
    "ALTER TABLE customers ADD COLUMN closed_reason TEXT CHECK (closed_reason IN ('not_interested', 'failed'))"
  );
}

// Migration: `poll_type` lets a note double as a single/multiple-choice poll.
let noteColumns = db.prepare("PRAGMA table_info(notes)").all() as ColumnInfo[];
if (!noteColumns.some((c) => c.name === "poll_type")) {
  db.exec("ALTER TABLE notes ADD COLUMN poll_type TEXT CHECK (poll_type IN ('single', 'multiple'))");
}

// Migration: `position` lets notes be drag-reordered by the team instead of
// always sitting in created_at order - backfill preserves the previous
// newest-first order so nothing visibly jumps around on upgrade.
noteColumns = db.prepare("PRAGMA table_info(notes)").all() as ColumnInfo[];
if (!noteColumns.some((c) => c.name === "position")) {
  db.exec("ALTER TABLE notes ADD COLUMN position INTEGER NOT NULL DEFAULT 0");
  const rows = db
    .prepare("SELECT id FROM notes ORDER BY created_at DESC, id DESC")
    .all() as { id: number }[];
  const stmt = db.prepare("UPDATE notes SET position = ? WHERE id = ?");
  rows.forEach((r, idx) => stmt.run(idx, r.id));
}

// Migration: `highlighted` lets a task be flagged as extra-important,
// rendered with a red-tinted card on the board.
const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as ColumnInfo[];
if (!taskColumns.some((c) => c.name === "highlighted")) {
  db.exec("ALTER TABLE tasks ADD COLUMN highlighted INTEGER NOT NULL DEFAULT 0");
}
