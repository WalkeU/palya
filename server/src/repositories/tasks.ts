import { db } from "../db";

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
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  stage: TaskStage;
  assignee_id?: number | null;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  stage?: TaskStage;
  assignee_id?: number | null;
  position?: number;
}

const SELECT_TASK = `
  SELECT t.*, u.nickname as assignee_nickname, u.email as assignee_email, u.avatar as assignee_avatar
  FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
`;

export const tasksRepo = {
  list(): Task[] {
    return db
      .prepare(`${SELECT_TASK} ORDER BY t.stage, t.position ASC, t.id ASC`)
      .all() as Task[];
  },

  findById(id: number): Task | undefined {
    return db.prepare(`${SELECT_TASK} WHERE t.id = ?`).get(id) as
      | Task
      | undefined;
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
    return this.findById(info.lastInsertRowid as number)!;
  },

  update(id: number, input: TaskUpdateInput): Task | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const merged = {
      title: input.title ?? existing.title,
      description:
        input.description !== undefined ? input.description : existing.description,
      stage: input.stage ?? existing.stage,
      assigneeId:
        input.assignee_id !== undefined ? input.assignee_id : existing.assignee_id,
      position: input.position !== undefined ? input.position : existing.position,
    };

    db.prepare(
      `UPDATE tasks SET
        title = @title, description = @description, stage = @stage,
        assignee_id = @assigneeId, position = @position, updated_at = datetime('now')
       WHERE id = @id`
    ).run({ ...merged, id });

    return this.findById(id);
  },

  reorder(stage: TaskStage, orderedIds: number[]) {
    const stmt = db.prepare(
      "UPDATE tasks SET position = ?, stage = ?, updated_at = datetime('now') WHERE id = ?"
    );
    const tx = db.transaction((ids: number[]) => {
      ids.forEach((id, index) => {
        stmt.run(index, stage, id);
      });
    });
    tx(orderedIds);
  },

  remove(id: number) {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  },
};
