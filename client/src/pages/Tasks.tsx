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
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Tag, Task, TaskStage, TeamMember } from "../types";
import { TASK_STAGES } from "../types";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { TopBar } from "../components/TopBar";
import { TaskColumn } from "../components/TaskColumn";
import { TaskCard } from "../components/TaskCard";
import { TaskDetailPanel } from "../components/TaskDetailPanel";
import { NewTaskModal } from "../components/NewTaskModal";
import { PeopleFilterBar } from "../components/PeopleFilterBar";
import { TagFilterBar } from "../components/TagFilterBar";

const BOARD_STAGE_KEYS = new Set(TASK_STAGES.map((s) => s.key));

type Tab = "board" | "backlog" | "closed";

function SimpleTaskList({
  stage,
  tasks,
  onOpenTask,
  onReordered,
  emptyLabel,
}: {
  stage: TaskStage;
  tasks: Task[];
  onOpenTask: (t: Task) => void;
  onReordered: (orderedIds: number[]) => void;
  emptyLabel: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIndex = tasks.findIndex((t) => t.id === active.id);
    const overIndex = tasks.findIndex((t) => t.id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;
    const reordered = arrayMove(tasks, activeIndex, overIndex);
    onReordered(reordered.map((t) => t.id));
  }

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-ink-100 py-12 text-center text-xs text-ink-300">
        {emptyLabel}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="mx-auto flex max-w-xl flex-col gap-2.5">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("board");
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    Promise.all([
      api<{ tasks: Task[] }>("/api/tasks"),
      api<{ members: TeamMember[] }>("/api/members"),
      api<{ tags: Tag[] }>("/api/tags"),
    ]).then(([taskData, memberData, tagData]) => {
      setTasks(taskData.tasks);
      setMembers(memberData.members);
      setTags(tagData.tags);
      setLoading(false);
    });
  }, []);

  // Tasks.tsx fetches its own members list (and each task's assignee info)
  // once on mount; when the logged-in user edits their own avatar/nickname
  // via the TopBar profile modal, that only updates AuthContext - patch the
  // matching member entry and any tasks assigned to them here too, rather
  // than refetching everything, to keep the filter bar/cards in sync
  // without an extra round trip.
  useEffect(() => {
    if (!user) return;
    setMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === user.id);
      if (idx === -1) return prev;
      const current = prev[idx];
      if (current.nickname === user.nickname && current.avatar === user.avatar) {
        return prev;
      }
      const next = [...prev];
      next[idx] = { ...current, nickname: user.nickname, avatar: user.avatar };
      return next;
    });
    setTasks((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        if (
          t.assignee_id !== user.id ||
          (t.assignee_nickname === user.nickname && t.assignee_avatar === user.avatar)
        ) {
          return t;
        }
        changed = true;
        return { ...t, assignee_nickname: user.nickname, assignee_avatar: user.avatar };
      });
      return changed ? next : prev;
    });
  }, [user?.id, user?.nickname, user?.avatar]);

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((t) => selectedPersonId === null || t.assignee_id === selectedPersonId)
        .filter(
          (t) =>
            selectedTagIds.size === 0 ||
            t.tags.some((tag) => selectedTagIds.has(tag.id))
        ),
    [tasks, selectedPersonId, selectedTagIds]
  );

  function toggleTagFilter(id: number) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const columns = useMemo(
    () =>
      TASK_STAGES.map((s) => ({
        ...s,
        items: visibleTasks
          .filter((t) => t.stage === s.key)
          .sort((a, b) => a.position - b.position),
      })),
    [visibleTasks]
  );

  const backlogTasks = useMemo(
    () =>
      visibleTasks.filter((t) => t.stage === "backlog").sort((a, b) => a.position - b.position),
    [visibleTasks]
  );
  const closedTasks = useMemo(
    () =>
      visibleTasks.filter((t) => t.stage === "closed").sort((a, b) => a.position - b.position),
    [visibleTasks]
  );

  const activeTask = tasks.find((t) => t.id === activeId) || null;

  function findContainer(id: number | string): TaskStage | undefined {
    if (typeof id === "string" && BOARD_STAGE_KEYS.has(id as TaskStage)) {
      return id as TaskStage;
    }
    return tasks.find((t) => t.id === id)?.stage;
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
    setTasks((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, stage: overContainer } : t))
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const container = findContainer(active.id);
    if (!container) return;

    const items = tasks
      .filter((t) => t.stage === container)
      .sort((a, b) => a.position - b.position);
    const activeIndex = items.findIndex((t) => t.id === active.id);
    let overIndex = items.findIndex((t) => t.id === over.id);
    if (overIndex === -1) overIndex = items.length - 1;

    const reordered = arrayMove(items, activeIndex, overIndex);
    const orderedIds = reordered.map((t) => t.id);

    setTasks((prev) => {
      const others = prev.filter((t) => t.stage !== container);
      const updated = reordered.map((t, idx) => ({ ...t, position: idx }));
      return [...others, ...updated];
    });

    const data = await api<{ tasks: Task[] }>("/api/tasks/reorder", {
      method: "PATCH",
      body: { stage: container, orderedIds },
    });
    setTasks(data.tasks);
  }

  async function handleSimpleReorder(stage: TaskStage, orderedIds: number[]) {
    setTasks((prev) => {
      const others = prev.filter((t) => t.stage !== stage);
      const byId = new Map(prev.map((t) => [t.id, t]));
      const updated = orderedIds.map((id, idx) => ({ ...byId.get(id)!, position: idx }));
      return [...others, ...updated];
    });
    const data = await api<{ tasks: Task[] }>("/api/tasks/reorder", {
      method: "PATCH",
      body: { stage, orderedIds },
    });
    setTasks(data.tasks);
  }

  function handleUpdated(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelected(updated);
  }

  function handleDeleted(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelected(null);
  }

  const newTaskDefaults: Record<Tab, { stage: TaskStage; allowPicker: boolean }> = {
    board: { stage: "todo", allowPicker: true },
    backlog: { stage: "backlog", allowPicker: false },
    closed: { stage: "backlog", allowPicker: false },
  };

  return (
    <div className="flex h-screen flex-col">
      <TopBar />

      <div className="border-b border-ink-100 bg-surface px-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {[
              { key: "board" as Tab, label: "Tábla" },
              { key: "backlog" as Tab, label: `Backlog${backlogTasks.length ? ` (${backlogTasks.length})` : ""}` },
              { key: "closed" as Tab, label: `Lezárva${closedTasks.length ? ` (${closedTasks.length})` : ""}` },
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
          {tab !== "closed" && (
            <button
              onClick={() => setCreating(true)}
              className="rounded-lg bg-night px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              + Új feladat
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-ink-100 bg-ink-50/60 px-3 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-2">
          <PeopleFilterBar
            members={members}
            selectedId={selectedPersonId}
            onSelect={setSelectedPersonId}
          />
          {tags.length > 0 && (
            <>
              <div className="hidden h-6 w-px bg-ink-300 sm:block" />
              <TagFilterBar
                tags={tags}
                selectedIds={selectedTagIds}
                onToggle={toggleTagFilter}
                onClear={() => setSelectedTagIds(new Set())}
              />
            </>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-x-auto overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">
            Betöltés…
          </div>
        ) : tab === "board" ? (
          <DndContext
            sensors={sensors}
            autoScroll={{ threshold: { x: 0.2, y: 0.25 }, acceleration: 20 }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex snap-x snap-mandatory gap-4 sm:gap-5">
              {columns.map((col) => (
                <TaskColumn
                  key={col.key}
                  stage={col.key}
                  label={col.label}
                  accent={col.accent}
                  tasks={col.items}
                  onOpenTask={setSelected}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <div className="w-[240px] rotate-2">
                  <TaskCard task={activeTask} onOpen={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : tab === "backlog" ? (
          <SimpleTaskList
            stage="backlog"
            tasks={backlogTasks}
            onOpenTask={setSelected}
            onReordered={(ids) => handleSimpleReorder("backlog", ids)}
            emptyLabel="Nincs backlog feladat"
          />
        ) : (
          <SimpleTaskList
            stage="closed"
            tasks={closedTasks}
            onOpenTask={setSelected}
            onReordered={(ids) => handleSimpleReorder("closed", ids)}
            emptyLabel="Nincs lezárt feladat"
          />
        )}
      </main>

      {selected && (
        <TaskDetailPanel
          task={selected}
          members={members}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {creating && (
        <NewTaskModal
          members={members}
          defaultStage={newTaskDefaults[tab].stage}
          allowStagePicker={newTaskDefaults[tab].allowPicker}
          onClose={() => setCreating(false)}
          onCreated={(t) => {
            setTasks((prev) => [...prev, t]);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}
