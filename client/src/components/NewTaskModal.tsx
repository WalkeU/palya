import { FormEvent, useEffect, useState } from "react";
import type { Tag, Task, TaskStage, TeamMember } from "../types";
import { TASK_STAGES } from "../types";
import { api } from "../api/client";
import { TagChip } from "./TagChip";
import { AssigneePicker } from "./AssigneePicker";
import { useEscapeToClose } from "../hooks/useEscapeToClose";

export function NewTaskModal({
  members,
  defaultStage,
  allowStagePicker,
  onClose,
  onCreated,
}: {
  members: TeamMember[];
  defaultStage: TaskStage;
  allowStagePicker: boolean;
  onClose: () => void;
  onCreated: (t: Task) => void;
}) {
  useEscapeToClose(onClose);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [stage, setStage] = useState<TaskStage>(defaultStage);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ tags: Tag[] }>("/api/tags").then((d) => setTags(d.tags));
  }, []);

  function toggleTag(id: number) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("A cím megadása kötelező.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await api<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: {
          title: title.trim(),
          description: description.trim() || null,
          assignee_id: assigneeId ? Number(assigneeId) : null,
          stage,
          tag_ids: selectedTagIds,
        },
      });
      onCreated(data.task);
    } catch {
      setError("Nem sikerült létrehozni a feladatot.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-night/25 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md animate-rise-in rounded-2xl border border-ink-100 bg-surface p-6 shadow-panel"
        >
          <h2 className="mb-4 font-display text-xl font-medium text-ink-950">
            Új feladat
          </h2>

          <div className="mb-3.5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Cím
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
              placeholder="Mit kell csinálni?"
            />
          </div>

          <div className="mb-3.5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Leírás
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Felelős
            </label>
            <AssigneePicker
              members={members}
              value={assigneeId}
              onChange={setAssigneeId}
            />
          </div>

          {tags.length > 0 && (
            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Címkék
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button key={t.id} type="button" onClick={() => toggleTag(t.id)}>
                    <TagChip tag={t} active={selectedTagIds.includes(t.id)} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {allowStagePicker && (
            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Fázis
              </label>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                {TASK_STAGES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStage(s.key)}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2.5 text-center text-[10px] font-medium leading-tight transition"
                    style={{
                      borderColor: stage === s.key ? s.accent : "rgb(var(--ink-100))",
                      backgroundColor:
                        stage === s.key ? `${s.accent}1a` : "rgb(var(--ink-50))",
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
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-scale-1/10 px-3 py-2 text-sm text-scale-1">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-500 transition hover:text-ink-900"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-night px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Létrehozás…" : "Létrehozás"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
