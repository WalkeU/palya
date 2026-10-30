import type { StageDef } from "../types";

/**
 * The "Fázis" chip grid used by the customer / task panels and modals. Stages
 * are user-editable (up to 12, labels up to 30 chars), so the grid reflows by
 * available width instead of a fixed column count, and long labels wrap to at
 * most two lines (full name in the tooltip).
 */
export function StagePicker({
  stages,
  value,
  onChange,
  idleBackground = "surface",
  label = "Fázis",
}: {
  stages: StageDef[];
  value: string;
  onChange: (key: string) => void;
  /** Background of unselected chips: match the surface the grid sits on. */
  idleBackground?: "surface" | "ink-50";
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid grid-cols-[repeat(auto-fit,minmax(4.5rem,1fr))] gap-1.5"
    >
      {stages.map((s) => {
        const selected = value === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            aria-pressed={selected}
            title={s.label}
            className="flex min-h-[3.25rem] min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-center text-[11px] font-medium leading-tight outline-none transition focus-visible:ring-2 focus-visible:ring-brand-400"
            style={{
              borderColor: selected ? s.accent : "rgb(var(--ink-100))",
              backgroundColor: selected ? `${s.accent}1a` : `rgb(var(--${idleBackground}))`,
              color: selected ? s.accent : "rgb(var(--ink-700))",
            }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.accent }}
            />
            <span className="line-clamp-2 max-w-full break-words">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
