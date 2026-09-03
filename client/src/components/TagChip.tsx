export function TagChip({
  tag,
  active = true,
}: {
  tag: { name: string; color: string };
  active?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium leading-none transition"
      style={{
        borderColor: active ? tag.color : "rgb(var(--ink-100))",
        backgroundColor: active ? `${tag.color}1f` : "rgb(var(--surface))",
        color: active ? tag.color : "rgb(var(--ink-700))",
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
    </span>
  );
}
