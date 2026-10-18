import { db } from "../db";

export type ExpenseCategory =
  | "software"
  | "equipment"
  | "marketing"
  | "travel"
  | "office"
  | "other";

export interface Expense {
  id: number;
  title: string;
  amount: number;
  spent_on: string;
  category: ExpenseCategory;
  paid_by: number | null;
  payer_nickname: string | null;
  payer_email: string | null;
  payer_avatar: string | null;
  note: string | null;
  settled: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

interface ExpenseInput {
  title: string;
  amount: number;
  spent_on: string;
  category: ExpenseCategory;
  paid_by?: number | null;
  note?: string | null;
  settled?: boolean;
}

type ExpenseRow = Omit<Expense, "settled"> & { settled: number };

function toExpense(row: ExpenseRow): Expense {
  return { ...row, settled: !!row.settled };
}

const SELECT_EXPENSE = `
  SELECT e.*, u.nickname as payer_nickname, u.email as payer_email, u.avatar as payer_avatar
  FROM expenses e
  LEFT JOIN users u ON u.id = e.paid_by
`;

export const expensesRepo = {
  list(): Expense[] {
    const rows = db
      .prepare(`${SELECT_EXPENSE} ORDER BY e.spent_on DESC, e.id DESC`)
      .all() as ExpenseRow[];
    return rows.map(toExpense);
  },

  findById(id: number): Expense | undefined {
    const row = db.prepare(`${SELECT_EXPENSE} WHERE e.id = ?`).get(id) as
      | ExpenseRow
      | undefined;
    return row ? toExpense(row) : undefined;
  },

  create(input: ExpenseInput, createdBy: number | null): Expense {
    const info = db
      .prepare(
        `INSERT INTO expenses (title, amount, spent_on, category, paid_by, note, settled, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.title,
        input.amount,
        input.spent_on,
        input.category,
        input.paid_by ?? null,
        input.note || null,
        input.settled ? 1 : 0,
        createdBy
      );
    return this.findById(info.lastInsertRowid as number)!;
  },

  update(id: number, patch: Partial<ExpenseInput>): Expense | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    const next = {
      title: patch.title ?? existing.title,
      amount: patch.amount ?? existing.amount,
      spent_on: patch.spent_on ?? existing.spent_on,
      category: patch.category ?? existing.category,
      paid_by: patch.paid_by !== undefined ? patch.paid_by : existing.paid_by,
      note: patch.note !== undefined ? patch.note || null : existing.note,
      settled: patch.settled ?? existing.settled,
    };
    db.prepare(
      `UPDATE expenses SET title = ?, amount = ?, spent_on = ?, category = ?, paid_by = ?,
         note = ?, settled = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      next.title,
      next.amount,
      next.spent_on,
      next.category,
      next.paid_by,
      next.note,
      next.settled ? 1 : 0,
      id
    );
    return this.findById(id);
  },

  remove(id: number) {
    db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
  },
};
