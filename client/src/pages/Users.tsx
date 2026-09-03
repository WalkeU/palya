import { FormEvent, useEffect, useState } from "react";
import { TopBar } from "../components/TopBar";
import { api, ApiError } from "../api/client";

interface UserRow {
  id: number;
  email: string;
  nickname: string | null;
  role: "superadmin" | "user";
  must_change_password: number;
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{
    email: string;
    password: string;
    isReset: boolean;
  } | null>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);

  function load() {
    api<{ users: UserRow[] }>("/api/users").then((d) => setUsers(d.users));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api<{
        user: { email: string };
        temporaryPassword: string;
      }>("/api/users", { method: "POST", body: { email: email.trim() } });
      setReveal({ email: data.user.email, password: data.temporaryPassword, isReset: false });
      setEmail("");
      load();
    } catch (err) {
      if (err instanceof ApiError && err.body?.error === "email_taken") {
        setError("Ez az email cím már regisztrálva van.");
      } else {
        setError("Nem sikerült létrehozni a felhasználót.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(u: UserRow) {
    if (
      !window.confirm(
        `Biztosan visszaállítod ${u.email} jelszavát? A régi jelszava azonnal érvényét veszti.`
      )
    ) {
      return;
    }
    setResettingId(u.id);
    try {
      const data = await api<{
        user: { email: string };
        temporaryPassword: string;
      }>(`/api/users/${u.id}/reset-password`, { method: "POST" });
      setReveal({ email: data.user.email, password: data.temporaryPassword, isReset: true });
      load();
    } finally {
      setResettingId(null);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-6 py-8">
        <h1 className="mb-1 font-display text-2xl font-medium text-ink-950">
          Felhasználók
        </h1>
        <p className="mb-6 text-sm text-ink-500">
          Új felhasználó felvételekor a rendszer generál egy jelszót, amit az első
          belépéskor kötelező lecserélni.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mb-8 flex items-end gap-2 rounded-2xl border border-ink-100 bg-white p-4 shadow-card"
        >
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Email cím
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="uj.munkatars@pelda.hu"
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "Létrehozás…" : "Meghívás"}
          </button>
        </form>
        {error && (
          <div className="-mt-6 mb-6 rounded-lg bg-scale-1/10 px-3 py-2 text-sm text-scale-1">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Becenév</th>
                <th className="px-4 py-3 font-semibold">Szerepkör</th>
                <th className="px-4 py-3 font-semibold">Állapot</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-3 text-ink-900">{u.email}</td>
                  <td className="px-4 py-3 text-ink-700">{u.nickname || "—"}</td>
                  <td className="px-4 py-3 text-ink-700">
                    {u.role === "superadmin" ? "Superadmin" : "Felhasználó"}
                  </td>
                  <td className="px-4 py-3">
                    {u.must_change_password ? (
                      <span className="rounded-full bg-scale-3/15 px-2 py-0.5 text-[11px] font-semibold text-scale-3">
                        Jelszóváltás szükséges
                      </span>
                    ) : (
                      <span className="rounded-full bg-scale-5/15 px-2 py-0.5 text-[11px] font-semibold text-scale-5">
                        Aktív
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleResetPassword(u)}
                      disabled={resettingId === u.id}
                      className="text-xs font-medium text-ink-500 transition hover:text-ink-900 disabled:opacity-50"
                    >
                      {resettingId === u.id ? "Visszaállítás…" : "Jelszó visszaállítása"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {reveal && (
        <>
          <div className="fixed inset-0 z-30 bg-ink-950/25 animate-fade-in" />
          <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
            <div className="w-full max-w-sm animate-rise-in rounded-2xl border border-ink-100 bg-white p-6 shadow-panel">
              <h2 className="mb-1 font-display text-xl font-medium text-ink-950">
                {reveal.isReset ? "Jelszó visszaállítva" : "Felhasználó létrehozva"}
              </h2>
              <p className="mb-4 text-sm text-ink-500">
                Add át ezt a jelszót {reveal.email} részére. Ez csak most jelenik meg,
                utána nem lesz visszakereshető.
              </p>
              <div className="mb-5 rounded-lg border border-ink-100 bg-ink-50 px-4 py-3 text-center font-mono text-lg tracking-wide text-ink-950">
                {reveal.password}
              </div>
              <button
                onClick={() => setReveal(null)}
                className="w-full rounded-lg bg-ink-950 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                Rendben, elmentettem
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
