import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Customer } from "../types";
import { ScaleBadge } from "./ScaleBadge";

export function CustomerCard({
  customer,
  onOpen,
}: {
  customer: Customer;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: customer.id });

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
      className="group cursor-grab rounded-xl border border-ink-100 bg-white p-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-snug text-ink-950">
            {customer.name || customer.business}
          </h3>
          {customer.name && customer.business && (
            <p className="truncate text-xs text-ink-500">{customer.business}</p>
          )}
        </div>
        {customer.stage === "potential" && (
          <ScaleBadge value={customer.priority} label="Prioritás" />
        )}
        {customer.stage === "discussion" && (
          <ScaleBadge value={customer.motivation} label="Motiváció" />
        )}
      </div>

      {(customer.phone || customer.email) && (
        <div className="mb-1 space-y-0.5 text-xs text-ink-500">
          {customer.phone && <div>{customer.phone}</div>}
          {customer.email && <div className="truncate">{customer.email}</div>}
        </div>
      )}

      {customer.note && (
        <p className="mt-1.5 line-clamp-2 text-xs text-ink-500">{customer.note}</p>
      )}

      {!!customer.comment_count && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-ink-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {customer.comment_count}
        </div>
      )}
    </div>
  );
}
