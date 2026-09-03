import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api, ApiError } from "../api/client";
import type { Tag, User } from "../types";
import { TAG_COLORS } from "../types";
import { TopBar } from "../components/TopBar";
import { Avatar } from "../components/Avatar";
import { TagChip } from "../components/TagChip";
import { PasswordInput } from "../components/PasswordInput";
import { UsersManagement } from "../components/UsersManagement";

const AVATAR_SIZE = 160;

function resizeToJpegDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = () => {
      img.onerror = () => reject(new Error("decode_failed"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext("2d")!;
        const scale = Math.max(AVATAR_SIZE / img.width, AVATAR_SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (AVATAR_SIZE - w) / 2, (AVATAR_SIZE - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-card">
      <h2 className="mb-4 font-display text-lg font-medium text-ink-950">{title}</h2>
      {children}
    </div>
  );
}

function ProfileTab() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeToJpegDataUrl(file);
      setAvatar(dataUrl);
    } catch {
      setError("Nem sikerült beolvasni a képet.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("A becenév megadása kötelező.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await api<{ user: User }>("/api/auth/profile", {
        method: "PATCH",
        body: { nickname: nickname.trim(), avatar },
      });
      setUser(data.user);
      setSavedAt(Date.now());
    } catch {
      setError("Nem sikerült menteni.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <SettingsCard title="Profil">
        <form onSubmit={handleSubmit}>
          <div className="mb-5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative shrink-0"
              aria-label="Profilkép módosítása"
            >
              <Avatar avatar={avatar} name={nickname} size={64} />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-night/0 text-[10px] font-semibold text-white opacity-0 transition group-hover:bg-night/40 group-hover:opacity-100">
                Csere
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-ink-100 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:border-ink-300"
              >
                Kép feltöltése
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(null)}
                  className="ml-2 text-xs text-ink-500 transition hover:text-scale-1"
                >
                  Eltávolítás
                </button>
              )}
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Becenév
            </label>
            <input
              required
              maxLength={40}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-scale-1/10 px-3 py-2 text-sm text-scale-1">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-night px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Mentés…" : "Mentés"}
            </button>
            {savedAt && !error && (
              <span className="text-xs text-ink-500">Elmentve</span>
            )}
          </div>
        </form>
      </SettingsCard>

      <SettingsCard title="Megjelenés">
        <div className="grid max-w-xs grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className="rounded-lg border px-3 py-2.5 text-sm font-medium transition"
              style={{
                borderColor: theme === t ? "#3a8a74" : "rgb(var(--ink-100))",
                backgroundColor: theme === t ? "rgb(var(--brand-100))" : "rgb(var(--ink-50))",
                color: theme === t ? "#2f6f5e" : "rgb(var(--ink-700))",
              }}
            >
              {t === "light" ? "Világos" : "Sötét"}
            </button>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < 10) {
      setError("Az új jelszónak legalább 10 karakter hosszúnak kell lennie.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("A két új jelszó nem egyezik.");
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/auth/password", {
        method: "PATCH",
        body: { currentPassword, newPassword, newPasswordConfirm },
      });
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.body?.error === "invalid_current_password") {
        setError("A jelenlegi jelszó nem megfelelő.");
      } else {
        setError("Nem sikerült megváltoztatni a jelszót.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsCard title="Jelszó megváltoztatása">
      <form onSubmit={handleSubmit} className="max-w-xs space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            Jelenlegi jelszó
          </label>
          <PasswordInput
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            Új jelszó
          </label>
          <PasswordInput
            required
            minLength={10}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 10 karakter"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            Új jelszó megerősítése
          </label>
          <PasswordInput
            required
            minLength={10}
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-scale-1/10 px-3 py-2 text-sm text-scale-1">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-scale-5/10 px-3 py-2 text-sm text-scale-5">
            A jelszó megváltozott.
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-night px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? "Mentés…" : "Jelszó megváltoztatása"}
        </button>
      </form>
    </SettingsCard>
  );
}

function TagsTab() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(TAG_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<{ tags: Tag[] }>("/api/tags").then((d) => setTags(d.tags));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api("/api/tags", { method: "POST", body: { name: name.trim(), color } });
      setName("");
      load();
    } catch (err) {
      if (err instanceof ApiError && err.body?.error === "name_taken") {
        setError("Ilyen nevű címke már létezik.");
      } else {
        setError("Nem sikerült létrehozni a címkét.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Biztosan törlöd ezt a címkét? Minden taskról eltűnik.")) return;
    await api(`/api/tags/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <SettingsCard title="Címkék">
      <form onSubmit={handleSubmit} className="mb-6 max-w-sm space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            Új címke neve
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="pl. Fejlesztési feladat"
            className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex gap-1.5">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className="h-7 w-7 rounded-full border-2 transition"
              style={{
                backgroundColor: c,
                borderColor: color === c ? "rgb(var(--ink-700))" : "transparent",
              }}
            />
          ))}
        </div>
        {error && <p className="text-sm text-scale-1">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-lg bg-night px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          + Új címke
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && (
          <p className="text-sm text-ink-500">Még nincs egy címke sem.</p>
        )}
        {tags.map((t) => (
          <div key={t.id} className="group relative">
            <TagChip tag={t} />
            <button
              onClick={() => handleDelete(t.id)}
              aria-label={`${t.name} törlése`}
              className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-night text-[9px] text-white group-hover:flex"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

type Tab = "profil" | "jelszo" | "cimkek" | "felhasznalok";

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("profil");
  const isSuperAdmin = user?.role === "superadmin";

  const tabs: { key: Tab; label: string }[] = [
    { key: "profil", label: "Profil" },
    { key: "jelszo", label: "Jelszó" },
    { key: "cimkek", label: "Címkék" },
    ...(isSuperAdmin ? [{ key: "felhasznalok" as Tab, label: "Felhasználók" }] : []),
  ];

  return (
    <div className="flex h-screen flex-col">
      <TopBar />

      <div className="border-b border-ink-100 bg-surface px-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition"
              style={{
                borderColor: tab === t.key ? "#3a8a74" : "transparent",
                color: tab === t.key ? "rgb(var(--ink-950))" : "rgb(var(--ink-500))",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-3 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-2xl">
          {tab === "profil" && <ProfileTab />}
          {tab === "jelszo" && <PasswordTab />}
          {tab === "cimkek" && <TagsTab />}
          {tab === "felhasznalok" && isSuperAdmin && (
            <div>
              <h2 className="mb-4 font-display text-lg font-medium text-ink-950">
                Felhasználók
              </h2>
              <UsersManagement />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
