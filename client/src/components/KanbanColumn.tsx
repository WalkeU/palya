import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Customer, Stage } from "../types";
import { CustomerCard } from "./CustomerCard";

export function KanbanColumn({
  stage,
  label,
  accent,
  customers,
  onOpenCustomer,
}: {
  stage: Stage;
  label: string;
  accent: string;
  customers: Customer[];
  onOpenCustomer: (c: Customer) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex h-full w-[290px] shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <h2 className="text-sm font-semibold text-ink-900">{label}</h2>
        </div>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
          {customers.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2.5 rounded-2xl border border-dashed p-2.5 transition-colors ${
          isOver ? "border-brand-400 bg-brand-100/40" : "border-transparent"
        }`}
      >
        <SortableContext
          items={customers.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {customers.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              onOpen={() => onOpenCustomer(c)}
            />
          ))}
        </SortableContext>
        {customers.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl py-8 text-center text-xs text-ink-300">
            Nincs itt ügyfél
          </div>
        )}
      </div>
    </div>
  );
}
