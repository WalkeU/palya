import { FormEvent, useEffect, useState } from "react";
import type { Comment, Customer, Stage } from "../types";
import { STAGES } from "../types";
import { api } from "../api/client";
import { ScalePicker } from "./ScalePicker";
import { CommentList } from "./CommentList";

export function CustomerDetailPanel({
  customer,
  onClose,
  onUpdated,
  onDeleted,
}: {
  customer: Customer;
  onClose: () => void;
  onUpdated: (c: Customer) => void;
  onDeleted: (id: number) => void;
}) {
  const [form, setForm] = useState({
    name: customer.name || "",
    business: customer.business || "",
    phone: customer.phone || "",
    email: customer.email || "",
    note: customer.note || "",
  });
  const [stage, setStage] = useState<Stage>(customer.stage);
  const [priority, setPriority] = useState<number | null>(customer.priority);
  const [motivation, setMotivation] = useState<number | null>(customer.motivation);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    setForm({
      name: customer.name || "",
      business: customer.business || "",
      phone: customer.phone || "",
      email: customer.email || "",
      note: customer.note || "",
    });
    setStage(customer.stage);
    setPriority(customer.priority);
    setMotivation(customer.motivation);
  }, [customer.id]);

  useEffect(() => {
    api<{ comments: Comment[] }>(`/api/customers/${customer.id}/comments`).then((d) =>
      setComments(d.comments)
    );
  }, [customer.id]);

  async function persist(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      const data = await api<{ customer: Customer }>(
        `/api/customers/${customer.id}`,
        { method: "PATCH", body: patch }
      );
      onUpdated(data.customer);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  function handleFieldBlur() {
    const nextName = form.name.trim();
    const nextBusiness = form.business.trim();
    if (!nextName && !nextBusiness) {
      setHeaderError("A név vagy az üzlet megadása kötelező.");
      return;
    }
    setHeaderError(null);
    persist({
      name: nextName || null,
      business: nextBusiness || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      note: form.note.trim() || null,
    });
  }

  function handleStageChange(next: Stage) {
    setStage(next);
    persist({ stage: next });
  }

  async function handleSubmitComment(e: FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const data = await api<{ comment: Comment }>(
        `/api/customers/${customer.id}/comments`,
        { method: "POST", body: { text: newComment.trim() } }
      );
      setComments((prev) => [...prev, data.comment]);
      onUpdated({ ...customer, comment_count: comments.length + 1 });
      setNewComment("");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDelete() {
    const label = customer.name || customer.business || "az ügyfelet";
    if (!window.confirm(`Biztosan törlöd "${label}" ügyfelet?`)) return;
    await api(`/api/customers/${customer.id}`, { method: "DELETE" });
    onDeleted(customer.id);
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
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={handleFieldBlur}
              placeholder="Név"
              className="w-full rounded-md border border-transparent bg-transparent text-lg font-semibold text-ink-950 outline-none transition hover:border-ink-100 focus:border-brand-400 focus:bg-ink-50 focus:px-2 focus:py-1"
            />
            <input
              value={form.business}
              onChange={(e) => setForm((f) => ({ ...f, business: e.target.value }))}
              onBlur={handleFieldBlur}
              placeholder="Üzlet"
              className="w-full rounded-md border border-transparent bg-transparent text-sm text-ink-500 outline-none transition hover:border-ink-100 focus:border-brand-400 focus:bg-ink-50 focus:px-2 focus:py-0.5"
            />
            <p className="mt-0.5 text-xs text-ink-500">
              {headerError ? (
                <span className="text-scale-1">{headerError}</span>
              ) : saving ? (
                "Mentés…"
              ) : savedAt ? (
                "Elmentve"
              ) : (
                " "
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
          <section className="mb-5">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Fázis
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleStageChange(s.key)}
                  className="flex flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2.5 text-center text-[11px] font-medium leading-tight transition"
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
          </section>

          {stage === "potential" && (
            <section className="mb-5">
              <ScalePicker
                label="Priorizálás"
                value={priority}
                onChange={(v) => {
                  setPriority(v);
                  persist({ priority: v });
                }}
              />
            </section>
          )}

          {stage === "discussion" && (
            <section className="mb-5">
              <ScalePicker
                label="Motiváció"
                value={motivation}
                onChange={(v) => {
                  setMotivation(v);
                  persist({ motivation: v });
                }}
              />
            </section>
          )}

          <section className="mb-5 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Telefonszám
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                onBlur={handleFieldBlur}
                placeholder="Nincs megadva"
                className="w-full rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Email
              </label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                onBlur={handleFieldBlur}
                placeholder="Nincs megadva"
                className="w-full rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Jegyzet
              </label>
              <textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                onBlur={handleFieldBlur}
                rows={3}
                placeholder="Bármilyen egyéb adat…"
                className="w-full resize-none rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </section>

          <section>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Kommentek
            </span>
            <CommentList comments={comments} />
            <form onSubmit={handleSubmitComment} className="mt-3 flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Új komment…"
                className="flex-1 rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="submit"
                disabled={postingComment || !newComment.trim()}
                className="rounded-lg bg-night px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                Küldés
              </button>
            </form>
          </section>
        </div>

        <div className="border-t border-ink-100 bg-surface px-5 py-3">
          <button
            onClick={handleDelete}
            className="text-xs font-medium text-ink-500 transition hover:text-scale-1"
          >
            Ügyfél törlése
          </button>
        </div>
      </aside>
    </>
  );
}
