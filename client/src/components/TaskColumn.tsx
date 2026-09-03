import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task, TaskStage } from "../types";
import { TaskCard } from "./TaskCard";

export function TaskColumn({
  stage,
  label,
  accent,
  tasks,
  onOpenTask,
}: {
  stage: TaskStage;
  label: string;
  accent: string;
  tasks: Task[];
  onOpenTask: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex h-full min-w-[220px] flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <h2 className="text-sm font-semibold text-ink-900">{label}</h2>
        </div>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2.5 rounded-2xl border border-dashed p-2.5 transition-colors ${
          isOver ? "border-brand-400 bg-brand-100/40" : "border-transparent"
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl py-8 text-center text-xs text-ink-300">
            Nincs itt feladat
          </div>
        )}
      </div>
    </div>
  );
}
