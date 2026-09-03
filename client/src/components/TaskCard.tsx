import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types";
import { Avatar } from "./Avatar";
import { TagChip } from "./TagChip";

export function TaskCard({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className="group cursor-grab rounded-xl border border-ink-100 bg-surface p-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-ink-950">
          {task.title}
        </h3>
        {task.assignee_id && (
          <Avatar
            avatar={task.assignee_avatar}
            name={task.assignee_nickname || task.assignee_email}
            size={22}
          />
        )}
      </div>

      {task.description && (
        <p className="line-clamp-2 text-xs text-ink-500">{task.description}</p>
      )}

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
        </div>
      )}
    </div>
  );
}
