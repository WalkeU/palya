import { db } from "../db";
import { tagsRepo, type Tag } from "./tags";

export type TaskStage =
  | "backlog"
  | "todo"
  | "in_progress"
  | "blocked"
  | "waiting_review"
  | "done"
  | "closed";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  stage: TaskStage;
  assignee_id: number | null;
  assignee_nickname: string | null;
  assignee_email: string | null;
  assignee_avatar: string | null;
  position: number;
  highlighted: boolean;
  created_by: number | null;
  creator_nickname: string | null;
  creator_email: string | null;
  creator_avatar: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  comment_count: number;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  stage: TaskStage;
  assignee_id?: number | null;
  tag_ids?: number[];
}

export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  stage?: TaskStage;
  assignee_id?: number | null;
  position?: number;
  highlighted?: boolean;
  tag_ids?: number[];
}

const SELECT_TASK = `
  SELECT t.*, u.nickname as assignee_nickname, u.email as assignee_email, u.avatar as assignee_avatar,
         c.nickname as creator_nickname, c.email as creator_email, c.avatar as creator_avatar,
         (SELECT COUNT(*) FROM task_comments WHERE task_comments.task_id = t.id) as comment_count
  FROM tasks t
  LEFT JOIN users u ON u.id = t.assignee_id
  LEFT JOIN users c ON c.id = t.created_by
`;

function attachTags(tasks: Omit<Task, "tags">[]): Task[] {
  const tagsByTask = tagsRepo.listForTasks(tasks.map((t) => t.id));
  return tasks.map((t) => ({
    ...t,
    highlighted: !!t.highlighted,
    tags: tagsByTask.get(t.id) ?? [],
  }));
}

export const tasksRepo = {
  list(): Task[] {
    const rows = db
      .prepare(`${SELECT_TASK} ORDER BY t.stage, t.position ASC, t.id ASC`)
      .all() as Omit<Task, "tags">[];
    return attachTags(rows);
  },

  findById(id: number): Task | undefined {
    const row = db.prepare(`${SELECT_TASK} WHERE t.id = ?`).get(id) as
      | Omit<Task, "tags">
      | undefined;
    if (!row) return undefined;
    return attachTags([row])[0];
  },

  nextPosition(stage: TaskStage): number {
    const row = db
      .prepare(
        "SELECT COALESCE(MAX(position), -1) + 1 as pos FROM tasks WHERE stage = ?"
      )
      .get(stage) as { pos: number };
    return row.pos;
  },

  create(input: TaskInput, createdBy: number | null): Task {
    const position = this.nextPosition(input.stage);
    const info = db
      .prepare(
        `INSERT INTO tasks (title, description, stage, assignee_id, position, created_by)
         VALUES (@title, @description, @stage, @assigneeId, @position, @createdBy)`
      )
      .run({
        title: input.title,
        description: input.description ?? null,
        stage: input.stage,
        assigneeId: input.assignee_id ?? null,
        position,
        createdBy,
      });
    const id = info.lastInsertRowid as number;
    if (input.tag_ids) {
      tagsRepo.setTaskTags(id, input.tag_ids);
    }
    return this.findById(id)!;
  },

  update(id: number, input: TaskUpdateInput): Task | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const nextStage = input.stage ?? existing.stage;
    const doneAt =
      nextStage === "done"
        ? existing.stage === "done"
          ? undefined // keep whatever done_at already is - don't reset the timer on unrelated edits
          : "now"
        : nextStage !== existing.stage
        ? null // left "done" for something else - stop tracking
        : undefined;

    const merged = {
      title: input.title ?? existing.title,
      description:
        input.description !== undefined ? input.description : existing.description,
      stage: nextStage,
      assigneeId:
        input.assignee_id !== undefined ? input.assignee_id : existing.assignee_id,
      position: input.position !== undefined ? input.position : existing.position,
      highlighted:
        input.highlighted !== undefined
          ? input.highlighted
            ? 1
            : 0
          : existing.highlighted
          ? 1
          : 0,
    };

    if (doneAt === undefined) {
      db.prepare(
        `UPDATE tasks SET
          title = @title, description = @description, stage = @stage,
          assignee_id = @assigneeId, position = @position, highlighted = @highlighted,
          updated_at = datetime('now')
         WHERE id = @id`
      ).run({ ...merged, id });
    } else {
      db.prepare(
        `UPDATE tasks SET
          title = @title, description = @description, stage = @stage,
          assignee_id = @assigneeId, position = @position, highlighted = @highlighted,
          done_at = ${doneAt === "now" ? "datetime('now')" : "NULL"},
          updated_at = datetime('now')
         WHERE id = @id`
      ).run({ ...merged, id });
    }

    if (input.tag_ids !== undefined) {
      tagsRepo.setTaskTags(id, input.tag_ids);
    }

    return this.findById(id);
  },

  reorder(stage: TaskStage, orderedIds: number[]) {
    const getStage = db.prepare("SELECT stage FROM tasks WHERE id = ?");
    const stmtSame = db.prepare(
      "UPDATE tasks SET position = ?, stage = ?, updated_at = datetime('now') WHERE id = ?"
    );
    const stmtToDone = db.prepare(
      "UPDATE tasks SET position = ?, stage = ?, done_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    );
    const stmtFromDone = db.prepare(
      "UPDATE tasks SET position = ?, stage = ?, done_at = NULL, updated_at = datetime('now') WHERE id = ?"
    );
    const tx = db.transaction((ids: number[]) => {
      ids.forEach((id, index) => {
        const row = getStage.get(id) as { stage: TaskStage } | undefined;
        const prevStage = row?.stage;
        if (stage === "done" && prevStage !== "done") {
          stmtToDone.run(index, stage, id);
        } else if (stage !== "done" && prevStage === "done") {
          stmtFromDone.run(index, stage, id);
        } else {
          stmtSame.run(index, stage, id);
        }
      });
    });
    tx(orderedIds);
  },

  // Sweeps tasks that have sat in "done" past the configurable threshold
  // (app_settings.autoCloseDays) into "closed" - called periodically from
  // index.ts. Restorable via the normal "Visszaállítás" flow.
  autoCloseStale(days: number): number {
    const rows = db
      .prepare(
        "SELECT id FROM tasks WHERE stage = 'done' AND done_at IS NOT NULL AND done_at <= datetime('now', ?)"
      )
      .all(`-${days} days`) as { id: number }[];
    if (rows.length === 0) return 0;
    const startPos = this.nextPosition("closed");
    const stmt = db.prepare(
      "UPDATE tasks SET stage = 'closed', position = ?, done_at = NULL, updated_at = datetime('now') WHERE id = ?"
    );
    const tx = db.transaction((items: { id: number }[]) => {
      items.forEach((r, idx) => stmt.run(startPos + idx, r.id));
    });
    tx(rows);
    return rows.length;
  },

  remove(id: number) {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  },
};
