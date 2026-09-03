import { db } from "../db";

export interface Note {
  id: number;
  text: string;
  color: string;
  created_by: number | null;
  author_nickname: string | null;
  author_email: string | null;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_NOTE = `
  SELECT n.*, u.nickname as author_nickname, u.email as author_email, u.avatar as author_avatar
  FROM notes n
  LEFT JOIN users u ON u.id = n.created_by
`;

export const notesRepo = {
  list(): Note[] {
    return db.prepare(`${SELECT_NOTE} ORDER BY n.created_at DESC`).all() as Note[];
  },

  findById(id: number): Note | undefined {
    return db.prepare(`${SELECT_NOTE} WHERE n.id = ?`).get(id) as Note | undefined;
  },

  create(text: string, color: string, createdBy: number | null): Note {
    const info = db
      .prepare("INSERT INTO notes (text, color, created_by) VALUES (?, ?, ?)")
      .run(text, color, createdBy);
    return this.findById(info.lastInsertRowid as number)!;
  },

  update(id: number, patch: { text?: string; color?: string }): Note | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    const text = patch.text !== undefined ? patch.text : existing.text;
    const color = patch.color !== undefined ? patch.color : existing.color;
    db.prepare(
      "UPDATE notes SET text = ?, color = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(text, color, id);
    return this.findById(id);
  },

  remove(id: number) {
    db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  },
};
