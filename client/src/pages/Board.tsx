import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Customer, Stage } from "../types";
import { CLOSED_REASONS, STAGES } from "../types";
import { api } from "../api/client";
import { TopBar } from "../components/TopBar";
import { KanbanColumn } from "../components/KanbanColumn";
import { CustomerCard } from "../components/CustomerCard";
import { CustomerDetailPanel } from "../components/CustomerDetailPanel";
import { NewCustomerModal } from "../components/NewCustomerModal";

const STAGE_KEYS = new Set(STAGES.map((s) => s.key));

type Tab = "board" | "closed";

export default function Board() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("board");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    api<{ customers: Customer[] }>("/api/customers").then((d) => {
      setCustomers(d.customers);
      setLoading(false);
    });
  }, []);

  const activeCustomers = useMemo(
    () => customers.filter((c) => !c.closed_reason),
    [customers]
  );
  const closedCustomers = useMemo(
    () => customers.filter((c) => c.closed_reason).sort((a, b) => b.id - a.id),
    [customers]
  );

  const columns = useMemo(
    () =>
      STAGES.map((s) => ({
        ...s,
        items: activeCustomers
          .filter((c) => c.stage === s.key)
          .sort((a, b) => a.position - b.position),
      })),
    [activeCustomers]
  );

  const activeCustomer = customers.find((c) => c.id === activeId) || null;

  function findContainer(id: number | string): Stage | undefined {
    if (typeof id === "string" && STAGE_KEYS.has(id as Stage)) return id as Stage;
    return customers.find((c) => c.id === id)?.stage;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }
    setCustomers((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, stage: overContainer } : c))
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const container = findContainer(active.id);
    if (!container) return;

    const items = customers
      .filter((c) => c.stage === container)
      .sort((a, b) => a.position - b.position);
    const activeIndex = items.findIndex((c) => c.id === active.id);
    let overIndex = items.findIndex((c) => c.id === over.id);
    if (overIndex === -1) overIndex = items.length - 1;

    const reordered = arrayMove(items, activeIndex, overIndex);
    const orderedIds = reordered.map((c) => c.id);

    setCustomers((prev) => {
      const others = prev.filter((c) => c.stage !== container);
      const updated = reordered.map((c, idx) => ({ ...c, position: idx }));
      return [...others, ...updated];
    });

    const data = await api<{ customers: Customer[] }>("/api/customers/reorder", {
      method: "PATCH",
      body: { stage: container, orderedIds },
    });
    setCustomers(data.customers);
  }

  function handleUpdated(updated: Customer) {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(updated);
  }

  function handleDeleted(id: number) {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setSelected(null);
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar onNewCustomer={() => setCreating(true)} />

      <div className="border-b border-ink-100 bg-surface px-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] gap-1">
          {[
            { key: "board" as Tab, label: "Tábla" },
            {
              key: "closed" as Tab,
              label: `Lezárva${closedCustomers.length ? ` (${closedCustomers.length})` : ""}`,
            },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="border-b-2 px-3 py-3 text-sm font-medium transition"
              style={{
                borderColor: tab === t.key ? "#3a8a74" : "transparent",
                color: tab === t.key ? "rgb(var(--ink-950))" : "rgb(var(--ink-500))",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-x-auto overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">
            Betöltés…
          </div>
        ) : tab === "closed" ? (
          closedCustomers.length === 0 ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-ink-100 py-12 text-center text-xs text-ink-300">
              Nincs lezárt ügyfél
            </div>
          ) : (
            <DndContext sensors={sensors}>
              <SortableContext
                items={closedCustomers.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="mx-auto flex max-w-xl flex-col gap-2.5">
                  {closedCustomers.map((c) => (
                    <div key={c.id} className="relative">
                      <span
                        className="absolute right-3.5 top-3.5 z-10 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          color: CLOSED_REASONS.find((r) => r.key === c.closed_reason)
                            ?.accent,
                          backgroundColor: `${
                            CLOSED_REASONS.find((r) => r.key === c.closed_reason)?.accent
                          }1a`,
                        }}
                      >
                        {CLOSED_REASONS.find((r) => r.key === c.closed_reason)?.label}
                      </span>
                      <CustomerCard customer={c} onOpen={() => setSelected(c)} />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )
        ) : (
          <DndContext
            sensors={sensors}
            autoScroll={{ threshold: { x: 0.2, y: 0.25 }, acceleration: 20 }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex snap-x snap-mandatory gap-4 sm:gap-5">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.key}
                  stage={col.key}
                  label={col.label}
                  accent={col.accent}
                  customers={col.items}
                  onOpenCustomer={setSelected}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCustomer && (
                <div className="w-[270px] rotate-2">
                  <CustomerCard customer={activeCustomer} onOpen={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {selected && (
        <CustomerDetailPanel
          customer={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {creating && (
        <NewCustomerModal
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCustomers((prev) => [...prev, c]);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}
