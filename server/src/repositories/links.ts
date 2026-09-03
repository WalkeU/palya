import { db } from "../db";

export interface Link {
  id: number;
  label: string;
  url: string;
  icon: string | null;
  position: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export const linksRepo = {
  list(): Link[] {
    return db.prepare("SELECT * FROM links ORDER BY position ASC, id ASC").all() as Link[];
  },

  findById(id: number): Link | undefined {
    return db.prepare("SELECT * FROM links WHERE id = ?").get(id) as Link | undefined;
  },

  nextPosition(): number {
    const row = db
      .prepare("SELECT COALESCE(MAX(position), -1) + 1 as pos FROM links")
      .get() as { pos: number };
    return row.pos;
  },

  create(
    input: { label: string; url: string; icon?: string | null },
    createdBy: number | null
  ): Link {
    const position = this.nextPosition();
    const info = db
      .prepare(
        "INSERT INTO links (label, url, icon, position, created_by) VALUES (?, ?, ?, ?, ?)"
      )
      .run(input.label, input.url, input.icon ?? null, position, createdBy);
    return this.findById(info.lastInsertRowid as number)!;
  },

  update(
    id: number,
    patch: { label?: string; url?: string; icon?: string | null }
  ): Link | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    const label = patch.label !== undefined ? patch.label : existing.label;
    const url = patch.url !== undefined ? patch.url : existing.url;
    const icon = patch.icon !== undefined ? patch.icon : existing.icon;
    db.prepare(
      "UPDATE links SET label = ?, url = ?, icon = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(label, url, icon, id);
    return this.findById(id);
  },

  remove(id: number) {
    db.prepare("DELETE FROM links WHERE id = ?").run(id);
  },
};
