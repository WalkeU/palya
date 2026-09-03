import { db } from "../db";

export type Stage = "potential" | "discussion" | "building" | "done";

export interface Customer {
  id: number;
  name: string | null;
  business: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  stage: Stage;
  priority: number | null;
  motivation: number | null;
  position: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
}

export interface CustomerInput {
  name?: string | null;
  business?: string | null;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
  stage: Stage;
  priority?: number | null;
  motivation?: number | null;
}

export interface CustomerUpdateInput {
  name?: string | null;
  business?: string | null;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
  stage?: Stage;
  priority?: number | null;
  motivation?: number | null;
  position?: number;
}

export const customersRepo = {
  list(): Customer[] {
    return db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM comments WHERE comments.customer_id = c.id) as comment_count
         FROM customers c ORDER BY c.stage, c.position ASC, c.id ASC`
      )
      .all() as Customer[];
  },

  findById(id: number): Customer | undefined {
    return db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM comments WHERE comments.customer_id = c.id) as comment_count
         FROM customers c WHERE c.id = ?`
      )
      .get(id) as Customer | undefined;
  },

  nextPosition(stage: Stage): number {
    const row = db
      .prepare(
        "SELECT COALESCE(MAX(position), -1) + 1 as pos FROM customers WHERE stage = ?"
      )
      .get(stage) as { pos: number };
    return row.pos;
  },

  create(input: CustomerInput, createdBy: number | null): Customer {
    const position = this.nextPosition(input.stage);
    const info = db
      .prepare(
        `INSERT INTO customers (name, business, phone, email, note, stage, priority, motivation, position, created_by)
         VALUES (@name, @business, @phone, @email, @note, @stage, @priority, @motivation, @position, @createdBy)`
      )
      .run({
        name: input.name ?? null,
        business: input.business ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        note: input.note ?? null,
        stage: input.stage,
        priority: input.priority ?? null,
        motivation: input.motivation ?? null,
        position,
        createdBy,
      });
    return this.findById(info.lastInsertRowid as number)!;
  },

  update(id: number, input: CustomerUpdateInput): Customer | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const merged = {
      name: input.name !== undefined ? input.name : existing.name,
      business: input.business !== undefined ? input.business : existing.business,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      email: input.email !== undefined ? input.email : existing.email,
      note: input.note !== undefined ? input.note : existing.note,
      stage: input.stage ?? existing.stage,
      priority:
        input.priority !== undefined ? input.priority : existing.priority,
      motivation:
        input.motivation !== undefined
          ? input.motivation
          : existing.motivation,
      position: input.position !== undefined ? input.position : existing.position,
    };

    db.prepare(
      `UPDATE customers SET
        name = @name, business = @business, phone = @phone, email = @email, note = @note,
        stage = @stage, priority = @priority, motivation = @motivation,
        position = @position, updated_at = datetime('now')
       WHERE id = @id`
    ).run({ ...merged, id });

    return this.findById(id);
  },

  reorder(stage: Stage, orderedIds: number[]) {
    const stmt = db.prepare(
      "UPDATE customers SET position = ?, stage = ?, updated_at = datetime('now') WHERE id = ?"
    );
    const tx = db.transaction((ids: number[]) => {
      ids.forEach((id, index) => {
        stmt.run(index, stage, id);
      });
    });
    tx(orderedIds);
  },

  remove(id: number) {
    db.prepare("DELETE FROM customers WHERE id = ?").run(id);
  },
};
