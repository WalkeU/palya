import { db } from "../db";

export interface Subtask {
  id: number;
  task_id: number;
  text: string;
  completed: boolean;
  position: number;
  created_at: string;
}

function mapRow(row: Omit<Subtask, "completed"> & { completed: number }): Subtask {
  return { ...row, completed: !!row.completed };
}

export const subtasksRepo = {
  listForTask(taskId: number): Subtask[] {
    const rows = db
      .prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC, id ASC")
      .all(taskId) as (Omit<Subtask, "completed"> & { completed: number })[];
    return rows.map(mapRow);
  },

  listForTasks(taskIds: number[]): Map<number, Subtask[]> {
    const map = new Map<number, Subtask[]>();
    if (taskIds.length === 0) return map;
    const placeholders = taskIds.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT * FROM subtasks WHERE task_id IN (${placeholders}) ORDER BY position ASC, id ASC`
      )
      .all(...taskIds) as (Omit<Subtask, "completed"> & { completed: number })[];
    for (const row of rows.map(mapRow)) {
      const arr = map.get(row.task_id) ?? [];
      arr.push(row);
      map.set(row.task_id, arr);
    }
    return map;
  },

  nextPosition(taskId: number): number {
    const row = db
      .prepare("SELECT COALESCE(MAX(position), -1) + 1 as pos FROM subtasks WHERE task_id = ?")
      .get(taskId) as { pos: number };
    return row.pos;
  },

  findById(id: number): Subtask | undefined {
    const row = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(id) as
      | (Omit<Subtask, "completed"> & { completed: number })
      | undefined;
    return row ? mapRow(row) : undefined;
  },

  create(taskId: number, text: string): Subtask {
    const position = this.nextPosition(taskId);
    const info = db
      .prepare("INSERT INTO subtasks (task_id, text, position) VALUES (?, ?, ?)")
      .run(taskId, text, position);
    return this.findById(info.lastInsertRowid as number)!;
  },

  update(id: number, patch: { text?: string; completed?: boolean }): Subtask | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    const merged = {
      text: patch.text ?? existing.text,
      completed: (patch.completed !== undefined ? patch.completed : existing.completed) ? 1 : 0,
    };
    db.prepare("UPDATE subtasks SET text = @text, completed = @completed WHERE id = @id").run({
      ...merged,
      id,
    });
    return this.findById(id);
  },

  remove(id: number) {
    db.prepare("DELETE FROM subtasks WHERE id = ?").run(id);
  },
};
