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
  const [business, setBusiness] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<Stage>("potential");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() && !business.trim()) {
      setError("A név vagy az üzlet megadása kötelező.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await api<{ customer: Customer }>("/api/customers", {
        method: "POST",
        body: {
          name: name.trim() || null,
          business: business.trim() || null,
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
        className="fixed inset-0 z-30 bg-night/25 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md animate-rise-in rounded-2xl border border-ink-100 bg-surface p-6 shadow-panel"
        >
          <h2 className="mb-4 font-display text-xl font-medium text-ink-950">
            Új ügyfél
          </h2>

          <div className="mb-3.5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Név
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
              placeholder="Ügyfél neve"
            />
          </div>

          <div className="mb-3.5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Üzlet
            </label>
            <input
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
              placeholder="Cég / üzlet neve"
            />
            <p className="mt-1 text-[11px] text-ink-500">
              A név vagy az üzlet megadása kötelező.
            </p>
          </div>

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Telefonszám
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
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
              className="w-full resize-none rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Fázis
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStage(s.key)}
                  className="flex flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2.5 text-center text-[11px] font-medium leading-tight transition"
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
