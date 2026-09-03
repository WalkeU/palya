import { db } from "../db";

export interface CommentWithAuthor {
  id: number;
  customer_id: number;
  author_id: number | null;
  author_nickname: string | null;
  author_email: string | null;
  text: string;
  created_at: string;
}

export const commentsRepo = {
  listForCustomer(customerId: number): CommentWithAuthor[] {
    return db
      .prepare(
        `SELECT c.id, c.customer_id, c.author_id, u.nickname as author_nickname,
                u.email as author_email, c.text, c.created_at
         FROM comments c
         LEFT JOIN users u ON u.id = c.author_id
         WHERE c.customer_id = ?
         ORDER BY c.created_at ASC, c.id ASC`
      )
      .all(customerId) as CommentWithAuthor[];
  },

  create(customerId: number, authorId: number, text: string) {
    const info = db
      .prepare(
        `INSERT INTO comments (customer_id, author_id, text) VALUES (?, ?, ?)`
      )
      .run(customerId, authorId, text);
    return db
      .prepare(
        `SELECT c.id, c.customer_id, c.author_id, u.nickname as author_nickname,
                u.email as author_email, c.text, c.created_at
         FROM comments c LEFT JOIN users u ON u.id = c.author_id WHERE c.id = ?`
      )
      .get(info.lastInsertRowid as number) as CommentWithAuthor;
  },
};
