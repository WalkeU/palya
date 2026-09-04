import { db } from "../db";

export interface TaskCommentWithAuthor {
  id: number;
  task_id: number;
  author_id: number | null;
  author_nickname: string | null;
  author_email: string | null;
  text: string;
  created_at: string;
}

export const taskCommentsRepo = {
  listForTask(taskId: number): TaskCommentWithAuthor[] {
    return db
      .prepare(
        `SELECT c.id, c.task_id, c.author_id, u.nickname as author_nickname,
                u.email as author_email, c.text, c.created_at
         FROM task_comments c
         LEFT JOIN users u ON u.id = c.author_id
         WHERE c.task_id = ?
         ORDER BY c.created_at ASC, c.id ASC`
      )
      .all(taskId) as TaskCommentWithAuthor[];
  },

  create(taskId: number, authorId: number, text: string) {
    const info = db
      .prepare(`INSERT INTO task_comments (task_id, author_id, text) VALUES (?, ?, ?)`)
      .run(taskId, authorId, text);
    return db
      .prepare(
        `SELECT c.id, c.task_id, c.author_id, u.nickname as author_nickname,
                u.email as author_email, c.text, c.created_at
         FROM task_comments c LEFT JOIN users u ON u.id = c.author_id WHERE c.id = ?`
      )
      .get(info.lastInsertRowid as number) as TaskCommentWithAuthor;
  },
};
