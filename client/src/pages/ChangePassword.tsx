import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../api/client";
import type { User } from "../types";

export default function ChangePassword() {
  const { user, setUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 10) {
      setError("A jelszónak legalább 10 karakter hosszúnak kell lennie.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("A két jelszó nem egyezik.");
      return;
    }
    if (!nickname.trim()) {
      setError("A becenév megadása kötelező.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api<{ user: User }>("/api/auth/change-password", {
        method: "POST",
        body: { newPassword, newPasswordConfirm, nickname: nickname.trim() },
      });
      setUser(data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError("Nem sikerült menteni. Ellenőrizd az adatokat.");
      } else {
        setError("Váratlan hiba történt.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-rise-in">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-medium text-ink-950">
            Első belépés
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {user?.email} — állíts be egy saját jelszót és becenevet a folytatáshoz.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-ink-100 bg-white p-7 shadow-card"
        >
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Becenév
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={40}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
              placeholder="Ez jelenik meg a kommenteknél"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Új jelszó
            </label>
            <input
              type="password"
              required
              minLength={10}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
              placeholder="Min. 10 karakter"
            />
          </div>
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Új jelszó megerősítése
            </label>
            <input
              type="password"
              required
              minLength={10}
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
              placeholder="Ismét az új jelszó"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-scale-1/10 px-3 py-2 text-sm text-scale-1 animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-ink-950 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "Mentés…" : "Jelszó beállítása"}
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-3 w-full text-center text-xs text-ink-500 hover:text-ink-700"
          >
            Kijelentkezés
          </button>
        </form>
      </div>
    </div>
  );
}
