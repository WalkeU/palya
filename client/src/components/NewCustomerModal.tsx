import { FormEvent, useState } from "react";
import type { Customer, Stage } from "../types";
import { STAGES } from "../types";
import { api } from "../api/client";

export function NewCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<Stage>("potential");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("A név megadása kötelező.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await api<{ customer: Customer }>("/api/customers", {
        method: "POST",
        body: {
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          note: note.trim() || null,
          stage,
        },
      });
      onCreated(data.customer);
    } catch {
      setError("Nem sikerült létrehozni az ügyfelet.");
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
            Új ügyfél
          </h2>

          <div className="mb-3.5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Név *
            </label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
              placeholder="Ügyfél neve"
            />
          </div>

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Telefonszám
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="mb-3.5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Jegyzet
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Fázis
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStage(s.key)}
                  className="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition"
                  style={{
                    borderColor: stage === s.key ? s.accent : "#eef0f3",
                    backgroundColor: stage === s.key ? `${s.accent}1a` : "#f7f8fa",
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
