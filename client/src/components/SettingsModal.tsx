import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { api, ApiError } from "../api/client";
import type { AppSettings, Link, Tag, User } from "../types";
import { TAG_COLORS } from "../types";
import { Avatar } from "./Avatar";
import { TagChip } from "./TagChip";
import { PasswordInput } from "./PasswordInput";
import { UsersManagement } from "./UsersManagement";
import { ConfirmDialog } from "./ConfirmDialog";
import { useEscapeToClose } from "../hooks/useEscapeToClose";

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

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
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
            {savedAt && !error && <span className="text-xs text-ink-500">Elmentve</span>}
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
          <div className="rounded-lg bg-scale-1/10 px-3 py-2 text-sm text-scale-1">{error}</div>
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
        {tags.length === 0 && <p className="text-sm text-ink-500">Még nincs egy címke sem.</p>}
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

function LinksTab() {
  const { showToast } = useToast();
  const [links, setLinks] = useState<Link[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ linksEnabled: true });
  const [loading, setLoading] = useState(true);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingSave, setPendingSave] = useState<Link | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Link | null>(null);

  function load() {
    Promise.all([
      api<{ links: Link[] }>("/api/links"),
      api<AppSettings>("/api/settings"),
    ]).then(([linkData, settingsData]) => {
      setLinks(linkData.links);
      setSettings(settingsData);
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function handleToggleVisibility() {
    setTogglingVisibility(true);
    try {
      const next = await api<AppSettings>("/api/settings", {
        method: "PATCH",
        body: { linksEnabled: !settings.linksEnabled },
      });
      setSettings(next);
      showToast(next.linksEnabled ? "Linkek megjelenítése bekapcsolva" : "Linkek elrejtve a kezdőlapon");
    } catch {
      showToast("Nem sikerült módosítani a beállítást.", "error");
    } finally {
      setTogglingVisibility(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await api<{ link: Link }>("/api/links", {
        method: "POST",
        body: { label: label.trim(), url: url.trim(), icon: icon.trim() || null },
      });
      setLinks((prev) => [...prev, data.link]);
      setLabel("");
      setUrl("");
      setIcon("");
      showToast("Link hozzáadva");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body?.details?.fieldErrors?.url?.[0] || "Nem sikerült menteni a linket.");
      } else {
        setError("Nem sikerült menteni a linket.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(l: Link) {
    setEditingId(l.id);
    setEditLabel(l.label);
    setEditUrl(l.url);
    setEditIcon(l.icon || "");
    setEditError(null);
  }

  function requestSaveEdit(l: Link) {
    if (!editLabel.trim() || !editUrl.trim()) return;
    setPendingSave(l);
  }

  async function confirmSaveEdit() {
    if (!pendingSave) return;
    try {
      const data = await api<{ link: Link }>(`/api/links/${pendingSave.id}`, {
        method: "PATCH",
        body: {
          label: editLabel.trim(),
          url: editUrl.trim(),
          icon: editIcon.trim() || null,
        },
      });
      setLinks((prev) => prev.map((l) => (l.id === data.link.id ? data.link : l)));
      setEditingId(null);
      showToast("Link módosítva");
    } catch {
      setEditError("Nem sikerült menteni a módosítást.");
      showToast("Nem sikerült menteni a módosítást.", "error");
    } finally {
      setPendingSave(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await api(`/api/links/${pendingDelete.id}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.id !== pendingDelete.id));
      showToast("Link törölve");
    } catch {
      showToast("Nem sikerült törölni a linket.", "error");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-5">
      <SettingsCard title="Linkek megjelenítése">
        <div className="flex items-center justify-between gap-4">
          <p className="max-w-sm text-sm text-ink-500">
            Ha ki van kapcsolva, a linkek nem jelennek meg a kezdőlapon senkinek - de a lista
            itt megmarad.
          </p>
          <button
            type="button"
            onClick={handleToggleVisibility}
            disabled={togglingVisibility || loading}
            aria-pressed={settings.linksEnabled}
            className="relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60"
            style={{
              backgroundColor: settings.linksEnabled
                ? "rgb(var(--night))"
                : "rgb(var(--ink-100))",
            }}
          >
            <span
              className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
              style={{ left: settings.linksEnabled ? "26px" : "4px" }}
            />
          </button>
        </div>
      </SettingsCard>

      <SettingsCard title="Linkek">
        <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-2">
          <div className="w-16">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Ikon
            </label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={8}
              placeholder="🔗"
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-2.5 py-2.5 text-center text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Név
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              placeholder="pl. Fotók"
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="min-w-[200px] flex-[2]">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              Link
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !label.trim() || !url.trim()}
            className="rounded-lg bg-night px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            + Új link
          </button>
        </form>
        {error && <p className="mb-4 text-sm text-scale-1">{error}</p>}

        <div className="space-y-2">
          {loading && <p className="text-sm text-ink-500">Betöltés…</p>}
          {!loading && links.length === 0 && (
            <p className="text-sm text-ink-500">Még nincs egy link sem.</p>
          )}
          {links.map((l) =>
            editingId === l.id ? (
              <div
                key={l.id}
                className="flex flex-wrap items-end gap-2 rounded-lg border border-brand-400 bg-brand-100/30 p-2.5"
              >
                <input
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  maxLength={8}
                  className="w-14 rounded-lg border border-ink-100 bg-surface px-2 py-2 text-center text-sm outline-none focus:border-brand-400"
                />
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  maxLength={60}
                  className="min-w-[120px] flex-1 rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="min-w-[180px] flex-[2] rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-ink-500 transition hover:text-ink-900"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={() => requestSaveEdit(l)}
                  disabled={!editLabel.trim() || !editUrl.trim()}
                  className="rounded-lg bg-night px-3.5 py-2 text-xs font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
                >
                  Mentés
                </button>
                {editError && <p className="w-full text-xs text-scale-1">{editError}</p>}
              </div>
            ) : (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-lg border border-ink-100 bg-surface px-3.5 py-2.5"
              >
                <span className="text-base leading-none">{l.icon || "🔗"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{l.label}</p>
                  <p className="truncate text-xs text-ink-500">{l.url}</p>
                </div>
                <button
                  onClick={() => startEdit(l)}
                  className="shrink-0 text-xs font-medium text-ink-500 transition hover:text-ink-900"
                >
                  Szerkesztés
                </button>
                <button
                  onClick={() => setPendingDelete(l)}
                  className="shrink-0 text-xs font-medium text-ink-500 transition hover:text-scale-1"
                >
                  Törlés
                </button>
              </div>
            )
          )}
        </div>
      </SettingsCard>

      {pendingSave && (
        <ConfirmDialog
          title="Link módosítása"
          message={`Biztosan elmented a(z) "${pendingSave.label}" link módosításait?`}
          confirmLabel="Mentés"
          onConfirm={confirmSaveEdit}
          onCancel={() => setPendingSave(null)}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Link törlése"
          message={`Biztosan törlöd a(z) "${pendingDelete.label}" linket? Ez nem vonható vissza.`}
          confirmLabel="Törlés"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

type Tab = "profil" | "jelszo" | "cimkek" | "linkek" | "felhasznalok";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  useEscapeToClose(onClose);
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("profil");
  const isSuperAdmin = user?.role === "superadmin";

  const tabs: { key: Tab; label: string }[] = [
    { key: "profil", label: "Profil" },
    { key: "jelszo", label: "Jelszó" },
    { key: "cimkek", label: "Címkék" },
    { key: "linkek", label: "Linkek" },
    ...(isSuperAdmin ? [{ key: "felhasznalok" as Tab, label: "Felhasználók" }] : []),
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-night/25 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
        <div className="flex h-full w-full max-w-2xl animate-rise-in flex-col overflow-hidden rounded-2xl border border-ink-100 bg-ink-50 shadow-panel">
          <div className="flex items-center justify-between border-b border-ink-100 bg-surface px-5 py-4">
            <h1 className="font-display text-xl font-medium text-ink-950">Beállítások</h1>
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

          <div className="border-b border-ink-100 bg-surface px-5">
            <div className="flex gap-1 overflow-x-auto">
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

          <div className="flex-1 overflow-y-auto px-5 py-6">
            {tab === "profil" && <ProfileTab />}
            {tab === "jelszo" && <PasswordTab />}
            {tab === "cimkek" && <TagsTab />}
            {tab === "linkek" && <LinksTab />}
            {tab === "felhasznalok" && isSuperAdmin && (
              <div>
                <h2 className="mb-4 font-display text-lg font-medium text-ink-950">
                  Felhasználók
                </h2>
                <UsersManagement />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
