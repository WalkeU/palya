import { FormEvent, useState } from "react";
import type { Expense, ExpenseCategory, TeamMember } from "../types";
import { EXPENSE_CATEGORIES } from "../types";
import { api } from "../api/client";
import { AssigneePicker } from "./AssigneePicker";
import { ConfirmDialog } from "./ConfirmDialog";
import { useEscapeToClose } from "../hooks/useEscapeToClose";
import { formatGrouped, todayIso } from "../utils/format";

const inputClass =
  "w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100";
const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500";

/** Strips everything but digits, so pasted "12 500 Ft" or "12.500" both work. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
}

export function ExpenseModal({
  expense,
  members,
  currentUserId,
  onClose,
  onSaved,
  onDeleted,
}: {
  /** Omitted for "new expense"; set to edit an existing one. */
  expense?: Expense;
  members: TeamMember[];
  currentUserId: number;
  onClose: () => void;
  onSaved: (e: Expense, isNew: boolean) => void;
  onDeleted: (id: number) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // While the delete confirmation is open, Escape should close only that.
  useEscapeToClose(confirmingDelete ? () => {} : onClose);

  const isNew = !expense;
  const [title, setTitle] = useState(expense?.title ?? "");
  const [amountDigits, setAmountDigits] = useState(expense ? String(expense.amount) : "");
  const [spentOn, setSpentOn] = useState(expense?.spent_on ?? todayIso());
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "other");
  const [paidBy, setPaidBy] = useState<string>(
    expense ? (expense.paid_by != null ? String(expense.paid_by) : "") : String(currentUserId)
  );
  const [note, setNote] = useState(expense?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; amount?: string; form?: string }>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amount = Number(amountDigits);
    const nextErrors: typeof errors = {};
    if (!title.trim()) nextErrors.title = "Add meg, mit vettetek.";
    if (!amountDigits || amount <= 0) nextErrors.amount = "Adj meg egy pozitív összeget.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    const body = {
      title: title.trim(),
      amount,
      spent_on: spentOn,
      category,
      paid_by: paidBy ? Number(paidBy) : null,
      note: note.trim() || null,
    };
    try {
      const data = !expense
        ? await api<{ expense: Expense }>("/api/expenses", { method: "POST", body })
        : await api<{ expense: Expense }>(`/api/expenses/${expense.id}`, {
            method: "PATCH",
            body,
          });
      onSaved(data.expense, isNew);
    } catch {
      setErrors({ form: "Nem sikerült menteni a tételt." });
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!expense) return;
    try {
      await api(`/api/expenses/${expense.id}`, { method: "DELETE" });
      onDeleted(expense.id);
    } catch {
      setConfirmingDelete(false);
      setErrors({ form: "Nem sikerült törölni a tételt." });
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-night/25 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="max-h-full w-full max-w-md animate-rise-in overflow-y-auto rounded-2xl border border-ink-100 bg-surface p-6 shadow-panel"
        >
          <h2 className="mb-4 font-display text-xl font-medium text-ink-950">
            {isNew ? "Új költség" : "Költség szerkesztése"}
          </h2>

          <div className="mb-3.5">
            <label htmlFor="expense-title" className={labelClass}>
              Megnevezés
            </label>
            <input
              id="expense-title"
              autoFocus={isNew}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "expense-title-error" : undefined}
              className={inputClass}
              placeholder="pl. Figma éves előfizetés"
            />
            {errors.title && (
              <p id="expense-title-error" className="mt-1 text-xs text-scale-1">
                {errors.title}
              </p>
            )}
          </div>

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="expense-amount" className={labelClass}>
                Összeg
              </label>
              <div className="relative">
                <input
                  id="expense-amount"
                  inputMode="numeric"
                  autoComplete="off"
                  value={amountDigits ? formatGrouped(Number(amountDigits)) : ""}
                  onChange={(e) => setAmountDigits(digitsOnly(e.target.value))}
                  aria-invalid={!!errors.amount}
                  aria-describedby={errors.amount ? "expense-amount-error" : undefined}
                  className={`${inputClass} pr-10 text-right tabular-nums`}
                  placeholder="0"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-ink-500">
                  Ft
                </span>
              </div>
              {errors.amount && (
                <p id="expense-amount-error" className="mt-1 text-xs text-scale-1">
                  {errors.amount}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="expense-date" className={labelClass}>
                Dátum
              </label>
              <input
                id="expense-date"
                type="date"
                required
                value={spentOn}
                onChange={(e) => e.target.value && setSpentOn(e.target.value)}
                className={`${inputClass} tabular-nums`}
              />
            </div>
          </div>

          <div className="mb-3.5">
            <span className={labelClass}>Ki fizette</span>
            <AssigneePicker
              members={members}
              value={paidBy}
              onChange={setPaidBy}
              allowEmpty={false}
            />
          </div>

          <fieldset className="mb-3.5">
            <legend className={labelClass}>Kategória</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {EXPENSE_CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(c.key)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition"
                    style={{
                      borderColor: active ? c.accent : "rgb(var(--ink-100))",
                      backgroundColor: active ? `${c.accent}1a` : "rgb(var(--ink-50))",
                      color: active ? c.accent : "rgb(var(--ink-700))",
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: c.accent }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mb-5">
            <label htmlFor="expense-note" className={labelClass}>
              Megjegyzés <span className="font-normal normal-case tracking-normal">(opcionális)</span>
            </label>
            <textarea
              id="expense-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              className={`${inputClass} resize-none`}
              placeholder="Hol vettétek, számlaszám, miért kellett…"
            />
          </div>

          {errors.form && (
            <div role="alert" className="mb-4 rounded-lg bg-scale-1/10 px-3 py-2 text-sm text-scale-1">
              {errors.form}
            </div>
          )}

          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded-lg px-2 py-2 text-sm font-medium text-scale-1 transition hover:bg-scale-1/10"
              >
                Törlés
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-500 transition hover:text-ink-900"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-night px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
              >
                {submitting ? "Mentés…" : isNew ? "Rögzítés" : "Mentés"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {confirmingDelete && expense && (
        <ConfirmDialog
          title="Tétel törlése"
          message={`Biztosan törlöd: „${expense.title}”? Ez nem vonható vissza.`}
          confirmLabel="Törlés"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}
