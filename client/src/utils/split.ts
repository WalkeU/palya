import type { Expense } from "../types";

export type Transfer = { from: number; to: number; amount: number };

/** Who an expense is split between: its own list, or everyone if it has none. */
export function participantsOf(e: Pick<Expense, "split_with">, everyone: number[]): number[] {
  return e.split_with.length > 0 ? e.split_with : everyone;
}

/**
 * Splits an expense equally into whole forints. The leftover forints from
 * rounding go to the payer first (if they're in the split), so nobody else is
 * asked for a forint more than their fair share.
 */
export function sharesOf(
  e: Pick<Expense, "amount" | "paid_by" | "split_with">,
  everyone: number[]
): Map<number, number> {
  const people = participantsOf(e, everyone);
  const shares = new Map<number, number>();
  if (people.length === 0) return shares;
  const ordered =
    e.paid_by != null && people.includes(e.paid_by)
      ? [e.paid_by, ...people.filter((id) => id !== e.paid_by)]
      : people;
  const base = Math.floor(e.amount / ordered.length);
  const remainder = e.amount - base * ordered.length;
  ordered.forEach((id, i) => shares.set(id, base + (i < remainder ? 1 : 0)));
  return shares;
}

/**
 * Net position per person over the given expenses: positive means the team
 * owes them, negative means they owe. The payer is credited the full amount
 * and debited their own share, so paying for something automatically counts
 * toward what they owe. Expenses without a payer can't be attributed and are skipped.
 */
export function balancesOf(expenses: Expense[], everyone: number[]): Map<number, number> {
  const balances = new Map<number, number>();
  const add = (id: number, delta: number) => balances.set(id, (balances.get(id) ?? 0) + delta);
  for (const e of expenses) {
    if (e.paid_by == null) continue;
    const shares = sharesOf(e, everyone);
    if (shares.size === 0) continue;
    add(e.paid_by, e.amount);
    for (const [id, share] of shares) add(id, -share);
  }
  return balances;
}

/**
 * Turns balances into a short list of payments (greedy: biggest debtor pays
 * biggest creditor), which keeps the number of transfers small.
 */
export function transfersOf(balances: Map<number, number>): Transfer[] {
  const creditors = [...balances].filter(([, b]) => b > 0).map(([id, b]) => ({ id, left: b }));
  const debtors = [...balances].filter(([, b]) => b < 0).map(([id, b]) => ({ id, left: -b }));
  creditors.sort((a, b) => b.left - a.left);
  debtors.sort((a, b) => b.left - a.left);
  const transfers: Transfer[] = [];
  let c = 0;
  let d = 0;
  while (c < creditors.length && d < debtors.length) {
    const amount = Math.min(creditors[c].left, debtors[d].left);
    if (amount > 0) transfers.push({ from: debtors[d].id, to: creditors[c].id, amount });
    creditors[c].left -= amount;
    debtors[d].left -= amount;
    if (creditors[c].left === 0) c++;
    if (debtors[d].left === 0) d++;
  }
  return transfers;
}
