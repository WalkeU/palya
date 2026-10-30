import { db } from "../db";
import { appSettingsRepo } from "./appSettings";

export interface StageDef {
  key: string;
  label: string;
  accent: string;
}

// The built-in ("Default") stage sets. Keys match what the rows stored before
// stages became editable, so existing data needs no migration.
export const DEFAULT_CUSTOMER_STAGES: StageDef[] = [
  { key: "potential", label: "Potenciál", accent: "#d99a3d" },
  { key: "discussion", label: "Egyeztetés", accent: "#4d7ea8" },
  { key: "building", label: "Kiépítés alatt", accent: "#7c6bb0" },
  { key: "done", label: "Kész", accent: "#3a8a74" },
];

export const DEFAULT_TASK_STAGES: StageDef[] = [
  { key: "todo", label: "Todo", accent: "#6b7cae" },
  { key: "in_progress", label: "Work in Progress", accent: "#d99a3d" },
  { key: "blocked", label: "Blocked", accent: "#c85a4a" },
  { key: "waiting_review", label: "Waiting for review", accent: "#7c6bb0" },
  { key: "done", label: "Done", accent: "#3a8a74" },
];

/** Task stage that the auto-close sweep acts on; can be edited, never removed. */
export const TASK_DONE_KEY = "done";
/** Task stages that live outside the board columns (own tabs); not editable. */
export const TASK_FIXED_KEYS = ["backlog", "closed"] as const;

const CUSTOMER_KEY = "customerStages";
const TASK_KEY = "taskStages";

function read(key: string, fallback: StageDef[]): StageDef[] {
  const raw = appSettingsRepo.get(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as StageDef[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function newKey(taken: Set<string>): string {
  let key: string;
  do {
    key = "s" + Math.random().toString(36).slice(2, 8);
  } while (taken.has(key));
  return key;
}

/** Fills in keys for freshly added stages and returns the final ordered list. */
function normalize(input: { key?: string; label: string; accent: string }[]): StageDef[] {
  const taken = new Set(input.map((s) => s.key).filter((k): k is string => !!k));
  return input.map((s) => ({
    key: s.key ?? newKey(taken),
    label: s.label,
    accent: s.accent,
  }));
}

export const stagesRepo = {
  customerStages: () => read(CUSTOMER_KEY, DEFAULT_CUSTOMER_STAGES),
  taskStages: () => read(TASK_KEY, DEFAULT_TASK_STAGES),

  isCustomerStage(key: string): boolean {
    return this.customerStages().some((s) => s.key === key);
  },

  /** Board columns plus the fixed backlog / closed tabs. */
  isTaskStage(key: string): boolean {
    return (
      (TASK_FIXED_KEYS as readonly string[]).includes(key) ||
      this.taskStages().some((s) => s.key === key)
    );
  },

  /**
   * Saves a new customer stage list. Customers sitting in a removed stage
   * move to the first remaining one (appended at the bottom).
   */
  setCustomerStages(input: { key?: string; label: string; accent: string }[]): StageDef[] {
    const next = normalize(input);
    const keep = new Set(next.map((s) => s.key));
    const removed = this.customerStages().filter((s) => !keep.has(s.key));
    db.transaction(() => {
      for (const r of removed) {
        const target = next[0].key;
        const base = (
          db
            .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM customers WHERE stage = ?")
            .get(target) as { pos: number }
        ).pos;
        const rows = db
          .prepare("SELECT id FROM customers WHERE stage = ? ORDER BY position, id")
          .all(r.key) as { id: number }[];
        const stmt = db.prepare(
          "UPDATE customers SET stage = ?, position = ?, updated_at = datetime('now') WHERE id = ?"
        );
        rows.forEach((row, i) => stmt.run(target, base + i, row.id));
      }
      appSettingsRepo.set(CUSTOMER_KEY, JSON.stringify(next));
    })();
    return next;
  },

  /** Same for task board columns; tasks in a removed column go to the first one. */
  setTaskStages(input: { key?: string; label: string; accent: string }[]): StageDef[] {
    const next = normalize(input);
    const keep = new Set(next.map((s) => s.key));
    const removed = this.taskStages().filter((s) => !keep.has(s.key));
    db.transaction(() => {
      for (const r of removed) {
        const target = next[0].key;
        const base = (
          db
            .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM tasks WHERE stage = ?")
            .get(target) as { pos: number }
        ).pos;
        const rows = db
          .prepare("SELECT id FROM tasks WHERE stage = ? ORDER BY position, id")
          .all(r.key) as { id: number }[];
        const stmt = db.prepare(
          "UPDATE tasks SET stage = ?, position = ?, done_at = ?, updated_at = datetime('now') WHERE id = ?"
        );
        rows.forEach((row, i) =>
          stmt.run(target, base + i, target === TASK_DONE_KEY ? new Date().toISOString().slice(0, 19).replace("T", " ") : null, row.id)
        );
      }
      appSettingsRepo.set(TASK_KEY, JSON.stringify(next));
    })();
    return next;
  },
};
