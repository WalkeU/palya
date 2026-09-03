const SCALE_COLORS: Record<number, string> = {
  1: "#dd5a4c",
  2: "#e0925a",
  3: "#d9b23f",
  4: "#8ebd54",
  5: "#3f9a6e",
};

export function ScaleBadge({
  value,
  label,
}: {
  value: number | null;
  label: string;
}) {
  const color = value ? SCALE_COLORS[value] : "rgb(var(--ink-300))";
  return (
    <span
      title={`${label}${value ? `: ${value}/5` : ": nincs beállítva"}`}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color: value ? color : "rgb(var(--ink-500))",
        backgroundColor: value ? `${color}1a` : "rgb(var(--ink-100))",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {value ? value : "–"}
    </span>
  );
}

export { SCALE_COLORS };
