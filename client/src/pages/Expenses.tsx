import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Expense, ExpenseCategory, TeamMember } from "../types";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_BY_KEY } from "../types";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { TopBar } from "../components/TopBar";
import { Avatar } from "../components/Avatar";
import { ExpenseModal } from "../components/ExpenseModal";
import { PeopleFilterBar, type PersonFilter } from "../components/PeopleFilterBar";
import {
  currentMonthKey,
  formatDayLabel,
  formatGrouped,
  formatHuf,
  formatMonthLabel,
  shiftMonth,
} from "../utils/format";

// `?honap=2026-10` or `?honap=osszes` - kept in the URL so a filtered view
// can be bookmarked/shared and survives a reload.
const ALL_PERIODS = "osszes";
const MONTH_PARAM = /^\d{4}-\d{2}$/;

function payerName(e: Pick<Expense, "payer_nickname" | "payer_email">): string {
  return e.payer_nickname || e.payer_email || "Ismeretlen";
}

function byNewest(a: Expense, b: Expense): number {
  return a.spent_on === b.spent_on ? b.id - a.id : a.spent_on < b.spent_on ? 1 : -1;
}

function sum(list: Expense[]): number {
  return list.reduce((acc, e) => acc + e.amount, 0);
}

function downloadCsv(rows: Expense[], fileLabel: string) {
  const escape = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    ["Dátum", "Megnevezés", "Kategória", "Összeg (Ft)", "Fizette", "Megjegyzés"],
    ...rows.map((e) => [
      e.spent_on,
      e.title,
      EXPENSE_CATEGORY_BY_KEY[e.category].label,
      String(e.amount),
      payerName(e),
      e.note ?? "",
    ]),
  ].map((cols) => cols.map(escape).join(";"));
  // BOM + semicolons: what Hungarian-locale Excel expects when double-clicking a .csv.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `koltsegek-${fileLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SummaryCard({
  periodLabel,
  total,
  count,
  previousTotal,
  people,
  categories,
  personFilter,
  categoryFilter,
  onTogglePerson,
  onToggleCategory,
}: {
  periodLabel: string;
  total: number;
  count: number;
  previousTotal: number | null;
  people: { id: PersonFilter; name: string; avatar: string | null; amount: number }[];
  categories: { key: ExpenseCategory; label: string; accent: string; amount: number }[];
  personFilter: PersonFilter;
  categoryFilter: ExpenseCategory | null;
  onTogglePerson: (id: PersonFilter) => void;
  onToggleCategory: (key: ExpenseCategory) => void;
}) {
  // Below lg the summary sits above the list; keep it to the headline total
  // there unless asked, so the list itself stays within the first screen.
  const [expanded, setExpanded] = useState(false);
  const peopleMax = Math.max(1, ...people.map((p) => p.amount));
  const categoryTotal = categories.reduce((acc, c) => acc + c.amount, 0);
  const delta =
    previousTotal && previousTotal > 0
      ? Math.round(((total - previousTotal) / previousTotal) * 100)
      : null;

  return (
    <section
      aria-label="Összesítés"
      className="rounded-2xl border border-ink-100 bg-surface shadow-card"
    >
      <div className="relative p-5">
        {(people.length > 0 || categoryTotal > 0) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="absolute right-3 top-3 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-ink-100 hover:text-ink-950 lg:hidden"
          >
            {expanded ? "Bontás elrejtése" : "Bontás"}
          </button>
        )}
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Összesen · {periodLabel}
        </p>
        <p className="mt-1.5 font-display text-3xl font-medium tabular-nums text-ink-950">
          {formatHuf(total)}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {count} tétel
          {delta !== null && (
            <>
              {" · "}
              <span className="tabular-nums text-ink-700">
                {delta > 0 ? "+" : delta < 0 ? "−" : "±"}
                {Math.abs(delta)}%
              </span>{" "}
              az előző hónaphoz képest
            </>
          )}
        </p>
      </div>

      <div className={expanded ? "block" : "hidden lg:block"}>
        {people.length > 0 && (
          <div className="border-t border-ink-100 px-5 py-4">
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Ki fizette
            </h2>
            <ul className="-mx-2 flex flex-col">
              {people.map((p) => {
                const active = personFilter === p.id;
                const dimmed = personFilter !== null && !active;
                return (
                  <li key={String(p.id)}>
                    <button
                      type="button"
                      onClick={() => onTogglePerson(p.id)}
                      aria-pressed={active}
                      className="w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-ink-50"
                      style={{ opacity: dimmed ? 0.45 : 1 }}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar avatar={p.avatar} name={p.name} size={22} />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink-900">
                          {p.name}
                        </span>
                        <span className="text-sm font-medium tabular-nums text-ink-950">
                          {formatHuf(p.amount)}
                        </span>
                      </div>
                      <div className="ml-[30px] mt-1.5 h-1 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-ink-500 transition-[width] duration-300"
                          style={{ width: `${(p.amount / peopleMax) * 100}%` }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {categoryTotal > 0 && (
          <div className="border-t border-ink-100 px-5 py-4">
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Kategóriák
            </h2>
            <div className="mb-3 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
              {categories.map((c) => (
                <div
                  key={c.key}
                  className="h-full transition-[width] duration-300"
                  style={{
                    width: `${(c.amount / categoryTotal) * 100}%`,
                    backgroundColor: c.accent,
                    opacity: categoryFilter && categoryFilter !== c.key ? 0.3 : 1,
                  }}
                />
              ))}
            </div>
            <ul className="-mx-2 flex flex-col">
              {categories.map((c) => {
                const active = categoryFilter === c.key;
                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => onToggleCategory(c.key)}
                      aria-pressed={active}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-ink-50"
                      style={{ opacity: categoryFilter && !active ? 0.45 : 1 }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: c.accent }}
                      />
                      <span className="flex-1 text-ink-900">{c.label}</span>
                      <span className="w-10 text-right text-xs tabular-nums text-ink-500">
                        {Math.round((c.amount / categoryTotal) * 100)}%
                      </span>
                      <span className="w-24 text-right font-medium tabular-nums text-ink-950">
                        {formatHuf(c.amount)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Expenses() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [personFilter, setPersonFilter] = useState<PersonFilter>(null);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [creating, setCreating] = useState(false);

  const monthParam = searchParams.get("honap");
  const month: string | null =
    monthParam === ALL_PERIODS
      ? null
      : monthParam && MONTH_PARAM.test(monthParam)
        ? monthParam
        : currentMonthKey();
  const periodLabel = month ? formatMonthLabel(month) : "Minden időszak";

  function setMonth(next: string | null) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === currentMonthKey()) p.delete("honap");
        else p.set("honap", next ?? ALL_PERIODS);
        return p;
      },
      { replace: true }
    );
  }

  useEffect(() => {
    Promise.all([
      api<{ expenses: Expense[] }>("/api/expenses"),
      api<{ members: TeamMember[] }>("/api/members"),
    ])
      .then(([expenseData, memberData]) => {
        setExpenses(expenseData.expenses);
        setMembers(memberData.members);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  // "N" opens a new entry - the most frequent action on this page - unless
  // the user is typing somewhere or a dialog is already open.
  const modalOpen = creating || editing !== null;
  useEffect(() => {
    if (modalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      setCreating(true);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  const query = search.trim().toLowerCase();
  const matchesSearch = (e: Expense) =>
    !query ||
    e.title.toLowerCase().includes(query) ||
    (e.note ?? "").toLowerCase().includes(query);
  const matchesPerson = (e: Expense) =>
    personFilter === null ||
    (personFilter === "unassigned" ? e.paid_by === null : e.paid_by === personFilter);
  const matchesCategory = (e: Expense) => categoryFilter === null || e.category === categoryFilter;

  const inPeriod = month ? expenses.filter((e) => e.spent_on.startsWith(month)) : expenses;

  const filtered = inPeriod.filter(
    (e) => matchesSearch(e) && matchesPerson(e) && matchesCategory(e)
  );
  const total = sum(filtered);

  const previousTotal = month
    ? sum(
        expenses.filter(
          (e) =>
            e.spent_on.startsWith(shiftMonth(month, -1)) &&
            matchesSearch(e) &&
            matchesPerson(e) &&
            matchesCategory(e)
        )
      )
    : null;

  // Each breakdown ignores its own filter (faceted), so clicking a person
  // or category narrows the list without collapsing that breakdown to one row.
  const people = (() => {
    const map = new Map<
      PersonFilter,
      { id: PersonFilter; name: string; avatar: string | null; amount: number }
    >();
    for (const e of inPeriod) {
      if (!matchesSearch(e) || !matchesCategory(e)) continue;
      const id: PersonFilter = e.paid_by ?? "unassigned";
      const row = map.get(id) ?? { id, name: payerName(e), avatar: e.payer_avatar, amount: 0 };
      row.amount += e.amount;
      map.set(id, row);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  })();

  const categories = (() => {
    const totals = new Map<ExpenseCategory, number>();
    for (const e of inPeriod) {
      if (!matchesSearch(e) || !matchesPerson(e)) continue;
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }
    return EXPENSE_CATEGORIES.filter((c) => totals.has(c.key))
      .map((c) => ({ ...c, amount: totals.get(c.key)! }))
      .sort((a, b) => b.amount - a.amount);
  })();

  const days = (() => {
    const groups: { date: string; items: Expense[]; total: number }[] = [];
    for (const e of filtered) {
      const last = groups[groups.length - 1];
      if (last && last.date === e.spent_on) {
        last.items.push(e);
        last.total += e.amount;
      } else {
        groups.push({ date: e.spent_on, items: [e], total: e.amount });
      }
    }
    return groups;
  })();

  const hasFilters = personFilter !== null || categoryFilter !== null || query !== "";

  function clearFilters() {
    setPersonFilter(null);
    setCategoryFilter(null);
    setSearch("");
  }

  function handleSaved(saved: Expense, isNew: boolean) {
    setExpenses((prev) =>
      (isNew ? [...prev, saved] : prev.map((e) => (e.id === saved.id ? saved : e))).sort(byNewest)
    );
    setCreating(false);
    setEditing(null);
    showToast(isNew ? "Költség rögzítve" : "Költség módosítva");
    // Jump to the entry's month if it was saved outside the one in view, so
    // it doesn't look like it vanished.
    if (month && !saved.spent_on.startsWith(month)) setMonth(saved.spent_on.slice(0, 7));
  }

  function handleDeleted(id: number) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setEditing(null);
    showToast("Költség törölve");
  }

  const iconButton =
    "flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100";

  return (
    <div className="flex h-screen flex-col">
      <TopBar />

      <div className="border-b border-ink-100 bg-surface px-3 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              role="group"
              aria-label="Időszak"
              className="flex rounded-lg bg-ink-100 p-0.5 text-xs font-medium"
            >
              {[
                { key: "month", label: "Havi", active: month !== null },
                { key: "all", label: "Összes", active: month === null },
              ].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={o.active}
                  onClick={() => setMonth(o.key === "all" ? null : currentMonthKey())}
                  className="rounded-md px-3 py-1.5 transition"
                  style={{
                    backgroundColor: o.active ? "rgb(var(--surface))" : "transparent",
                    color: o.active ? "rgb(var(--ink-950))" : "rgb(var(--ink-500))",
                    boxShadow: o.active ? "0 1px 2px rgba(20, 23, 28, 0.08)" : "none",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {month && (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setMonth(shiftMonth(month, -1))}
                  aria-label="Előző hónap"
                  className={iconButton}
                >
                  <ChevronIcon direction="left" />
                </button>
                <span
                  aria-live="polite"
                  className="min-w-[8.5rem] text-center text-sm font-medium text-ink-950"
                >
                  {periodLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setMonth(shiftMonth(month, 1))}
                  aria-label="Következő hónap"
                  className={iconButton}
                >
                  <ChevronIcon direction="right" />
                </button>
                {month !== currentMonthKey() && (
                  <button
                    type="button"
                    onClick={() => setMonth(currentMonthKey())}
                    className="ml-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-100"
                  >
                    Aktuális
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadCsv(filtered, month ?? "osszes")}
              disabled={filtered.length === 0}
              title="A szűrt lista letöltése CSV-ként (Excelben megnyitható)"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100 hover:text-ink-950 disabled:pointer-events-none disabled:opacity-40"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => setCreating(true)}
              title="Új költség (N)"
              className="rounded-lg bg-night px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              + Új költség
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-ink-100 bg-ink-50/60 px-3 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-5 gap-y-2">
          <PeopleFilterBar
            members={members}
            selectedId={personFilter}
            onSelect={setPersonFilter}
            showUnassigned={false}
          />
          <div className="hidden h-6 w-px bg-ink-300 sm:block" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Keresés…"
            aria-label="Keresés a költségek között"
            className="min-w-[160px] flex-1 rounded-lg border border-ink-100 bg-surface px-3 py-1.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:max-w-xs sm:flex-none"
          />
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-ink-500 transition hover:text-ink-950"
            >
              Szűrők törlése
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">
            Betöltés…
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">
            Nem sikerült betölteni a költségeket. Frissítsd az oldalt.
          </div>
        ) : (
          <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
            <div className="lg:sticky lg:top-0 lg:order-2">
              <SummaryCard
                periodLabel={periodLabel}
                total={total}
                count={filtered.length}
                previousTotal={previousTotal}
                people={people}
                categories={categories}
                personFilter={personFilter}
                categoryFilter={categoryFilter}
                onTogglePerson={(id) => setPersonFilter((cur) => (cur === id ? null : id))}
                onToggleCategory={(key) => setCategoryFilter((cur) => (cur === key ? null : key))}
              />
            </div>

            <div className="lg:order-1">
              {days.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-300/70 px-6 py-14 text-center">
                  <p className="text-sm text-ink-500">
                    {hasFilters
                      ? "Nincs a szűrésnek megfelelő tétel."
                      : month
                        ? "Ebben a hónapban még nincs rögzített költség."
                        : "Még nincs rögzített költség."}
                  </p>
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-100"
                    >
                      Szűrők törlése
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="rounded-lg bg-night px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                    >
                      + Első tétel rögzítése
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {days.map((day) => (
                    <section key={day.date} aria-label={formatDayLabel(day.date)}>
                      <div className="mb-1.5 flex items-baseline justify-between px-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                        <span>{formatDayLabel(day.date)}</span>
                        {day.items.length > 1 && (
                          <span className="tabular-nums">{formatGrouped(day.total)} Ft</span>
                        )}
                      </div>
                      <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-card">
                        {day.items.map((e) => {
                          const cat = EXPENSE_CATEGORY_BY_KEY[e.category];
                          return (
                            <li key={e.id}>
                              <button
                                type="button"
                                onClick={() => setEditing(e)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink-50 focus-visible:bg-ink-50 focus-visible:outline-none"
                              >
                                <span
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                  style={{ backgroundColor: `${cat.accent}1f` }}
                                  aria-hidden="true"
                                >
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: cat.accent }}
                                  />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-ink-950">
                                    {e.title}
                                  </span>
                                  <span className="block truncate text-xs text-ink-500">
                                    {cat.label}
                                    {e.note && ` · ${e.note}`}
                                  </span>
                                </span>
                                <span title={`Fizette: ${payerName(e)}`} className="shrink-0">
                                  <Avatar avatar={e.payer_avatar} name={payerName(e)} size={24} />
                                </span>
                                <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-950 sm:w-28">
                                  {formatHuf(e.amount)}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {(creating || editing) && user && (
        <ExpenseModal
          expense={editing ?? undefined}
          members={members}
          currentUserId={user.id}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
