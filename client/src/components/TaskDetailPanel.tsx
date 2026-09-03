import { useEffect, useState } from "react";
import type { Tag, Task, TaskStage, TeamMember } from "../types";
import { TASK_STAGES } from "../types";
import { api } from "../api/client";
import { TagChip } from "./TagChip";
import { AssigneePicker } from "./AssigneePicker";
import { Avatar } from "./Avatar";
import { useEscapeToClose } from "../hooks/useEscapeToClose";

function formatDateTime(iso: string): string {
  return new Date(iso + "Z").toLocaleString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskDetailPanel({
  task,
  members,
  onClose,
  onUpdated,
  onDeleted,
}: {
  task: Task;
  members: TeamMember[];
  onClose: () => void;
  onUpdated: (t: Task) => void;
  onDeleted: (id: number) => void;
}) {
  useEscapeToClose(onClose);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
  });
  const [stage, setStage] = useState<TaskStage>(task.stage);
  const [assigneeId, setAssigneeId] = useState<string>(
    task.assignee_id ? String(task.assignee_id) : ""
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  useEffect(() => {
    setForm({ title: task.title, description: task.description || "" });
    setStage(task.stage);
    setAssigneeId(task.assignee_id ? String(task.assignee_id) : "");
  }, [task.id]);

  useEffect(() => {
    api<{ tags: Tag[] }>("/api/tags").then((d) => setAllTags(d.tags));
  }, []);

  function toggleTag(id: number) {
    const current = task.tags.map((t) => t.id);
    const next = current.includes(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    persist({ tag_ids: next });
  }

  async function persist(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      const data = await api<{ task: Task }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: patch,
      });
      onUpdated(data.task);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  function handleTitleBlur() {
    const nextTitle = form.title.trim();
    if (!nextTitle) {
      setTitleError("A cím megadása kötelező.");
      return;
    }
    setTitleError(null);
    persist({ title: nextTitle });
  }

  function handleDescriptionBlur() {
    persist({ description: form.description.trim() || null });
  }

  function handleStageChange(next: TaskStage) {
    setStage(next);
    persist({ stage: next });
  }

  function handleAssigneeChange(value: string) {
    setAssigneeId(value);
    persist({ assignee_id: value ? Number(value) : null });
  }

  async function handleDelete() {
    if (!window.confirm(`Biztosan törlöd "${task.title}" feladatot?`)) return;
    await api(`/api/tasks/${task.id}`, { method: "DELETE" });
    onDeleted(task.id);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-night/20 animate-fade-in"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md animate-panel-in flex-col border-l border-ink-100 bg-ink-50 shadow-panel">
        <div className="flex items-center justify-between border-b border-ink-100 bg-surface px-5 py-4">
          <div className="min-w-0 flex-1">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onBlur={handleTitleBlur}
              placeholder="Cím"
              className="w-full rounded-md border border-transparent bg-transparent text-lg font-semibold text-ink-950 outline-none transition hover:border-ink-100 focus:border-brand-400 focus:bg-ink-50 focus:px-2 focus:py-1"
            />
            <p className="mt-0.5 text-xs text-ink-500">
              {titleError ? (
                <span className="text-scale-1">{titleError}</span>
              ) : saving ? (
                "Mentés…"
              ) : savedAt ? (
                "Elmentve"
              ) : (
                " "
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
            aria-label="Bezárás"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {stage === "backlog" && (
            <button
              onClick={() => handleStageChange("todo")}
              className="mb-5 w-full rounded-lg bg-night py-2 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Táblára
            </button>
          )}
          {stage === "done" && (
            <button
              onClick={() => handleStageChange("closed")}
              className="mb-5 w-full rounded-lg bg-night py-2 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Lezárás
            </button>
          )}
          {stage === "closed" && (
            <button
              onClick={() => handleStageChange("done")}
              className="mb-5 w-full rounded-lg border border-ink-100 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-300"
            >
              Visszaállítás (Done)
            </button>
          )}

          <section className="mb-5">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Fázis
            </span>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {TASK_STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleStageChange(s.key)}
                  className="flex flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2.5 text-center text-[10px] font-medium leading-tight transition"
                  style={{
                    borderColor: stage === s.key ? s.accent : "rgb(var(--ink-100))",
                    backgroundColor:
                      stage === s.key ? `${s.accent}1a` : "rgb(var(--surface))",
                    color: stage === s.key ? s.accent : "rgb(var(--ink-700))",
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: s.accent }}
                  />
                  {s.label}
                </button>
              ))}
            </div>
            {(stage === "backlog" || stage === "closed") && (
              <p className="mt-1.5 text-[11px] text-ink-500">
                Jelenleg: {stage === "backlog" ? "Backlog" : "Lezárva"}
              </p>
            )}
          </section>

          {allTags.length > 0 && (
            <section className="mb-5">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Címkék
              </span>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((t) => (
                  <button key={t.id} type="button" onClick={() => toggleTag(t.id)}>
                    <TagChip
                      tag={t}
                      active={task.tags.some((tt) => tt.id === t.id)}
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="mb-5 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Felelős
              </label>
              <AssigneePicker
                members={members}
                value={assigneeId}
                onChange={handleAssigneeChange}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Leírás
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                onBlur={handleDescriptionBlur}
                rows={4}
                placeholder="Bármilyen egyéb adat…"
                className="w-full resize-none rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </section>
        </div>

        <div className="border-t border-ink-100 bg-surface px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar
                avatar={task.creator_avatar}
                name={task.creator_nickname || task.creator_email}
                size={20}
              />
              <span className="truncate text-xs text-ink-500">
                {task.creator_nickname || task.creator_email || "Ismeretlen"} ·{" "}
                {formatDateTime(task.created_at)}
              </span>
            </div>
            <button
              onClick={handleDelete}
              className="shrink-0 text-xs font-medium text-ink-500 transition hover:text-scale-1"
            >
              Feladat törlése
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
