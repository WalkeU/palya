import { FormEvent, useEffect, useRef, useState } from "react";
import type { Tag, Task, TaskComment, TaskStage, TeamMember } from "../types";
import { TASK_STAGE_ACCENT, TASK_STAGES } from "../types";
import { api } from "../api/client";
import { TagChip } from "./TagChip";
import { AssigneePicker } from "./AssigneePicker";
import { Avatar } from "./Avatar";
import { CommentList } from "./CommentList";
import { NewTaskModal } from "./NewTaskModal";
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
  allTasks,
  onClose,
  onUpdated,
  onDeleted,
  onTaskCreated,
  onOpenTask,
}: {
  task: Task;
  members: TeamMember[];
  allTasks: Task[];
  onClose: () => void;
  onUpdated: (t: Task) => void;
  onDeleted: (id: number) => void;
  onTaskCreated: (t: Task) => void;
  onOpenTask: (t: Task) => void;
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

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [form.title]);

  useEffect(() => {
    setForm({ title: task.title, description: task.description || "" });
    setStage(task.stage);
    setAssigneeId(task.assignee_id ? String(task.assignee_id) : "");
  }, [task.id]);

  useEffect(() => {
    api<{ tags: Tag[] }>("/api/tags").then((d) => setAllTags(d.tags));
  }, []);

  useEffect(() => {
    api<{ comments: TaskComment[] }>(`/api/tasks/${task.id}/comments`).then((d) =>
      setComments(d.comments)
    );
  }, [task.id]);

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

  function handleUpdateDescription() {
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

  function handleToggleHighlight() {
    persist({ highlighted: !task.highlighted });
  }

  async function handleSubmitComment(e: FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const data = await api<{ comment: TaskComment }>(
        `/api/tasks/${task.id}/comments`,
        { method: "POST", body: { text: newComment.trim() } }
      );
      setComments((prev) => [...prev, data.comment]);
      onUpdated({ ...task, comment_count: comments.length + 1 });
      setNewComment("");
    } finally {
      setPostingComment(false);
    }
  }

  const children = allTasks.filter((t) => t.parent_task_id === task.id);

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-night/20 animate-fade-in"
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-md animate-panel-in flex-col border-l bg-ink-50 shadow-panel ${
          task.parent_task_id ? "border-subtask-500" : "border-ink-100"
        }`}
      >
        <div
          className={`flex items-center justify-between border-b border-ink-100 px-5 py-4 ${
            task.parent_task_id ? "bg-subtask-100/70" : "bg-surface"
          }`}
        >
          <div className="min-w-0 flex-1">
            {task.parent_task_id && task.parent_title && (
              <p className="mb-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-subtask-600">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <polyline points="9 10 4 15 9 20" />
                  <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                </svg>
                <span className="truncate">{task.parent_title}</span>
              </p>
            )}
            <textarea
              ref={titleRef}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
              placeholder="Cím"
              rows={1}
              className="w-full resize-none overflow-hidden break-words rounded-md border border-transparent bg-transparent text-lg font-semibold leading-snug text-ink-950 outline-none transition hover:border-ink-100 focus:border-brand-400 focus:bg-ink-50 focus:px-2 focus:py-1"
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
            onClick={handleToggleHighlight}
            aria-label={task.highlighted ? "Kiemelés eltávolítása" : "Feladat kiemelése"}
            title={task.highlighted ? "Kiemelés eltávolítása" : "Feladat kiemelése"}
            className="rounded-full p-1.5 transition hover:bg-ink-100"
            style={{ color: task.highlighted ? "#e0564b" : "rgb(var(--ink-500))" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={task.highlighted ? "currentColor" : "none"}
            >
              <path
                d="M5 3v18M5 4h11l-2.5 4L16 12H5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
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
            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              <Avatar
                avatar={task.creator_avatar}
                name={task.creator_nickname || task.creator_email}
                size={16}
              />
              <span className="truncate">
                {task.creator_nickname || task.creator_email || "Ismeretlen"} ·{" "}
                {formatDateTime(task.created_at)}
              </span>
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
                rows={4}
                placeholder="Bármilyen egyéb adat…"
                className="w-full resize-none rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={handleUpdateDescription}
                  disabled={form.description.trim() === (task.description || "")}
                  className="rounded-md bg-night px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  Frissítés
                </button>
              </div>
            </div>
          </section>

          {!task.parent_task_id && (
            <section className="mb-5">
              <span className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-500">
                Alfeladatok
                {children.length > 0 && (
                  <span className="normal-case tracking-normal text-ink-500">
                    {children.filter((c) => c.stage === "done" || c.stage === "closed").length}/
                    {children.length}
                  </span>
                )}
              </span>
              <div className="space-y-1">
                {children.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onOpenTask(c)}
                    className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition hover:bg-ink-100/60"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: TASK_STAGE_ACCENT[c.stage] }}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        c.stage === "done" || c.stage === "closed"
                          ? "text-ink-500 line-through"
                          : "text-ink-900"
                      }`}
                    >
                      {c.title}
                    </span>
                    {c.assignee_id && (
                      <Avatar
                        avatar={c.assignee_avatar}
                        name={c.assignee_nickname || c.assignee_email}
                        size={18}
                      />
                    )}
                  </button>
                ))}
                {children.length === 0 && (
                  <p className="text-sm text-ink-500">Még nincs egy alfeladat sem.</p>
                )}
              </div>
            </section>
          )}

          <section>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Kommentek
            </span>
            <CommentList comments={comments} />
            <form onSubmit={handleSubmitComment} className="mt-3 flex items-center gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Új komment…"
                className="flex-1 rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="submit"
                disabled={postingComment || !newComment.trim()}
                aria-label="Küldés"
                title="Küldés"
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-night text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 12h16M13 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>
          </section>
        </div>

        <div className="border-t border-ink-100 bg-surface px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {stage !== "backlog" && stage !== "closed" && (
                <button
                  onClick={() => handleStageChange("backlog")}
                  className="rounded-md border border-ink-100 px-2.5 py-1 text-xs font-medium text-ink-500 transition hover:border-ink-300 hover:text-ink-900"
                >
                  Backlogba
                </button>
              )}
              {stage === "done" && (
                <button
                  onClick={() => handleStageChange("closed")}
                  className="rounded-md border border-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
                >
                  Lezárás
                </button>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {!task.parent_task_id && (
                <button
                  onClick={() => setAddingSubtask(true)}
                  className="text-xs font-medium text-ink-500 transition hover:text-ink-900"
                >
                  + Alfeladat
                </button>
              )}
              <button
                onClick={handleDelete}
                className="text-xs font-medium text-ink-500 transition hover:text-scale-1"
              >
                Feladat törlése
              </button>
            </div>
          </div>
        </div>
      </aside>

      {addingSubtask && (
        <NewTaskModal
          members={members}
          defaultStage={
            TASK_STAGES.some((s) => s.key === task.stage)
              ? (task.stage as (typeof TASK_STAGES)[number]["key"])
              : "todo"
          }
          allowStagePicker
          parentTaskId={task.id}
          parentTaskTitle={task.title}
          onClose={() => setAddingSubtask(false)}
          onCreated={(created) => {
            onTaskCreated(created);
            setAddingSubtask(false);
          }}
        />
      )}
    </>
  );
}
