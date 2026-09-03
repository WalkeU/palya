import type { Tag } from "../types";

export function TagFilterBar({
  tags,
  selectedIds,
  onToggle,
  onClear,
}: {
  tags: Tag[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onClear: () => void;
}) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={onClear}
        className="rounded-full px-3 py-1 text-xs font-medium transition"
        style={{
          backgroundColor:
            selectedIds.size === 0 ? "rgb(var(--night))" : "rgb(var(--ink-100))",
          color: selectedIds.size === 0 ? "white" : "rgb(var(--ink-700))",
        }}
      >
        Mind
      </button>
      {tags.map((tag) => {
        const active = selectedIds.has(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => onToggle(tag.id)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium leading-none transition"
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
          </button>
        );
      })}
    </div>
  );
}
