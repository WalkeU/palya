const hufFormatter = new Intl.NumberFormat("hu-HU", {
  style: "currency",
  currency: "HUF",
  maximumFractionDigits: 0,
});

const groupFormatter = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 });

/** 12500 -> "12 500 Ft" */
export function formatHuf(amount: number): string {
  return hufFormatter.format(amount);
}

/** 12500 -> "12 500" (no currency suffix, for inputs/CSV). */
export function formatGrouped(amount: number): string {
  return groupFormatter.format(amount);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Today's date in the browser's local timezone, as YYYY-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-10" for the current local month. */
export function currentMonthKey(): string {
  return todayIso().slice(0, 7);
}

/** Shift a "YYYY-MM" key by `delta` months. */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** "2026-10" -> "2026. október" */
export function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
  });
}

/** "2026-10-18" -> "okt. 18., szombat" (year added when not the current one). */
export function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("hu-HU", {
    year: y === new Date().getFullYear() ? undefined : "numeric",
    month: "short",
    day: "numeric",
    weekday: "long",
  });
}
