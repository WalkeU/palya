import { FormEvent, useState } from "react";
import type { Task, TaskStage, TeamMember } from "../types";
import { TASK_STAGES } from "../types";
import { api } from "../api/client";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [stage, setStage] = useState<TaskStage>(defaultStage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        className="fixed inset-0 z-30 bg-ink-950/25 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md animate-rise-in rounded-2xl border border-ink-100 bg-white p-6 shadow-panel"
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
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
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
              className="w-full resize-none rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Felelős
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Nincs hozzárendelve</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nickname || m.email}
                </option>
              ))}
            </select>
          </div>

          {allowStagePicker && (
            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Fázis
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {TASK_STAGES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStage(s.key)}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2.5 text-center text-[10px] font-medium leading-tight transition"
                    style={{
                      borderColor: stage === s.key ? s.accent : "#eef0f3",
                      backgroundColor:
                        stage === s.key ? `${s.accent}1a` : "#f7f8fa",
                      color: stage === s.key ? s.accent : "#3a4150",
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
              className="rounded-lg bg-ink-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Létrehozás…" : "Létrehozás"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
