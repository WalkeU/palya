import { SCALE_COLORS } from "./ScaleBadge";

export function ScalePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </span>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] text-ink-500 hover:text-ink-700"
          >
            visszaállítás semlegesre
          </button>
        )}
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          const color = SCALE_COLORS[n];
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="flex h-9 flex-1 items-center justify-center rounded-lg border text-sm font-semibold transition"
              style={{
                borderColor: active ? color : "rgb(var(--ink-100))",
                backgroundColor: active ? `${color}1f` : "rgb(var(--ink-50))",
                color: active ? color : "rgb(var(--ink-500))",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
