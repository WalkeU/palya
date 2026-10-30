import { FormEvent, useEffect, useRef, useState } from "react";
import type { Tag, Task, TaskStage, TeamMember } from "../types";
import { useStages } from "../utils/stages";
import { api } from "../api/client";
import { StagePicker } from "./StagePicker";
import { TagChip } from "./TagChip";
import { AssigneePicker } from "./AssigneePicker";
import { useEscapeToClose } from "../hooks/useEscapeToClose";

export function NewTaskModal({
  members,
  defaultStage,
  allowStagePicker,
  parentTaskId,
  parentTaskTitle,
  onClose,
  onCreated,
}: {
  members: TeamMember[];
  defaultStage: TaskStage;
  allowStagePicker: boolean;
  parentTaskId?: number;
  parentTaskTitle?: string;
  onClose: () => void;
  /** `keepOpen`: the "Még egy feladat" box was ticked, the modal stays up. */
  onCreated: (t: Task, keepOpen: boolean) => void;
}) {
  useEscapeToClose(onClose);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const { taskStages: TASK_STAGES } = useStages();
  const [pickedStage, setStage] = useState<TaskStage>(defaultStage);
  // The default may predate a stage-list edit (or the store's first load);
  // never submit a board column that no longer exists.
  const stage: TaskStage =
    pickedStage === "backlog" ||
    pickedStage === "closed" ||
    TASK_STAGES.some((s) => s.key === pickedStage)
      ? pickedStage
      : (TASK_STAGES[0]?.key ?? pickedStage);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [another, setAnother] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
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
          parent_task_id: parentTaskId ?? null,
        },
      });
      const keepOpen = another && !parentTaskId;
      onCreated(data.task, keepOpen);
      if (keepOpen) {
        // Stage, assignee and tags stay: a batch usually shares them.
        setLastCreated(data.task.title);
        setTitle("");
        setDescription("");
        titleRef.current?.focus();
      }
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
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6">
        <form
          onSubmit={handleSubmit}
          className="max-h-full w-full max-w-md animate-rise-in overflow-y-auto rounded-2xl border border-ink-100 bg-surface p-6 shadow-panel"
        >
          <div className="mb-4">
            <h2 className="font-display text-xl font-medium text-ink-950">
              {parentTaskTitle ? "Új alfeladat" : "Új feladat"}
            </h2>
            {parentTaskTitle && (
              <p className="mt-0.5 text-xs text-ink-500">Ehhez: {parentTaskTitle}</p>
            )}
          </div>

          <div className="mb-3.5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Cím
            </label>
            <input
              ref={titleRef}
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
              <StagePicker
                stages={TASK_STAGES}
                value={stage}
                onChange={setStage}
                idleBackground="ink-50"
              />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-scale-1/10 px-3 py-2 text-sm text-scale-1">
              {error}
            </div>
          )}

          {lastCreated && (
            <p
              role="status"
              className="mb-3 truncate rounded-lg bg-brand-100 px-3 py-2 text-xs font-medium text-ink-950"
            >
              Létrehozva: {lastCreated}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            {!parentTaskId && (
              <label className="mr-auto flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-700">
                <input
                  type="checkbox"
                  checked={another}
                  onChange={(e) => setAnother(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-brand-600"
                />
                Még egy feladat
              </label>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-500 transition hover:text-ink-900"
            >
              {lastCreated ? "Kész" : "Mégse"}
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
