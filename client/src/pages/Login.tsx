import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { PasswordInput } from "../components/PasswordInput";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError && err.body?.error === "invalid_credentials") {
        setError("Hibás email cím vagy jelszó.");
      } else if (err instanceof ApiError && err.body?.error === "too_many_attempts") {
        setError("Túl sok próbálkozás. Kérlek várj egy kicsit.");
      } else {
        setError("Váratlan hiba történt. Próbáld újra.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-rise-in">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-scale-1" />
            <span className="h-2 w-2 rounded-full bg-scale-3" />
            <span className="h-2.5 w-2.5 rounded-full bg-scale-5" />
          </div>
          <h1 className="font-display text-3xl font-medium text-ink-950">Pálya</h1>
          <p className="text-sm text-ink-500">ügyfélkövető</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-ink-100 bg-white p-7 shadow-card"
        >
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
              placeholder="nev@pelda.hu"
            />
          </div>
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Jelszó
            </label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
            {submitting ? "Belépés…" : "Belépés"}
          </button>
        </form>
      </div>
    </div>
  );
}
