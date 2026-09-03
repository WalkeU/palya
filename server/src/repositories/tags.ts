import { db } from "../db";

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export const tagsRepo = {
  list(): Tag[] {
    return db.prepare("SELECT * FROM tags ORDER BY name ASC").all() as Tag[];
  },

  findById(id: number): Tag | undefined {
    return db.prepare("SELECT * FROM tags WHERE id = ?").get(id) as
      | Tag
      | undefined;
  },

  create(name: string, color: string): Tag {
    const info = db
      .prepare("INSERT INTO tags (name, color) VALUES (?, ?)")
      .run(name, color);
    return this.findById(info.lastInsertRowid as number)!;
  },

  remove(id: number) {
    db.prepare("DELETE FROM tags WHERE id = ?").run(id);
  },

  listForTasks(taskIds: number[]): Map<number, Tag[]> {
    const result = new Map<number, Tag[]>();
    if (taskIds.length === 0) return result;
    const placeholders = taskIds.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT tt.task_id as taskId, t.id, t.name, t.color, t.created_at
         FROM task_tags tt JOIN tags t ON t.id = tt.tag_id
         WHERE tt.task_id IN (${placeholders})
         ORDER BY t.name ASC`
      )
      .all(...taskIds) as (Tag & { taskId: number })[];
    for (const row of rows) {
      const { taskId, ...tag } = row;
      if (!result.has(taskId)) result.set(taskId, []);
      result.get(taskId)!.push(tag);
    }
    return result;
  },

  setTaskTags(taskId: number, tagIds: number[]) {
    const del = db.prepare("DELETE FROM task_tags WHERE task_id = ?");
    const ins = db.prepare(
      "INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)"
    );
    const tx = db.transaction((ids: number[]) => {
      del.run(taskId);
      for (const tagId of ids) {
        ins.run(taskId, tagId);
      }
    });
    tx(tagIds);
  },
};
