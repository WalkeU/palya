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
  /** User ids the expense is split between; empty means everyone. */
  split_with: number[];
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
  split_with?: number[];
}

type ExpenseRow = Omit<Expense, "settled" | "split_with"> & { settled: number };

function toExpense(row: ExpenseRow, splitWith: number[]): Expense {
  return { ...row, settled: !!row.settled, split_with: splitWith };
}

function participantsByExpense(): Map<number, number[]> {
  const rows = db
    .prepare("SELECT expense_id, user_id FROM expense_participants ORDER BY user_id")
    .all() as { expense_id: number; user_id: number }[];
  const map = new Map<number, number[]>();
  for (const r of rows) {
    const list = map.get(r.expense_id) ?? [];
    list.push(r.user_id);
    map.set(r.expense_id, list);
  }
  return map;
}

function participantsOf(expenseId: number): number[] {
  return (
    db
      .prepare("SELECT user_id FROM expense_participants WHERE expense_id = ? ORDER BY user_id")
      .all(expenseId) as { user_id: number }[]
  ).map((r) => r.user_id);
}

function setParticipants(expenseId: number, userIds: number[]) {
  db.prepare("DELETE FROM expense_participants WHERE expense_id = ?").run(expenseId);
  const insert = db.prepare(
    "INSERT OR IGNORE INTO expense_participants (expense_id, user_id) VALUES (?, ?)"
  );
  for (const userId of userIds) insert.run(expenseId, userId);
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
    const participants = participantsByExpense();
    return rows.map((r) => toExpense(r, participants.get(r.id) ?? []));
  },

  findById(id: number): Expense | undefined {
    const row = db.prepare(`${SELECT_EXPENSE} WHERE e.id = ?`).get(id) as
      | ExpenseRow
      | undefined;
    return row ? toExpense(row, participantsOf(id)) : undefined;
  },

  create(input: ExpenseInput, createdBy: number | null): Expense {
    const id = db.transaction(() => {
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
      const newId = info.lastInsertRowid as number;
      if (input.split_with) setParticipants(newId, input.split_with);
      return newId;
    })();
    return this.findById(id)!;
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
    db.transaction(() => {
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
      if (patch.split_with) setParticipants(id, patch.split_with);
    })();
    return this.findById(id);
  },

  /** Marks every listed expense "Elszámolva" in one go (closing a settle-up round). */
  settleMany(ids: number[]): number {
    const stmt = db.prepare(
      "UPDATE expenses SET settled = 1, updated_at = datetime('now') WHERE id = ? AND settled = 0"
    );
    return db.transaction(() => ids.reduce((acc, id) => acc + stmt.run(id).changes, 0))();
  },

  remove(id: number) {
    db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
  },
};
