import { FormEvent, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import type { User } from "../types";
import { Avatar } from "./Avatar";

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

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      onClose();
    } catch {
      setError("Nem sikerült menteni.");
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
          className="w-full max-w-sm animate-rise-in rounded-2xl border border-ink-100 bg-white p-6 shadow-panel"
        >
          <h2 className="mb-4 font-display text-xl font-medium text-ink-950">
            Profil
          </h2>

          <div className="mb-5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative shrink-0"
              aria-label="Profilkép módosítása"
            >
              <Avatar avatar={avatar} name={nickname} size={64} />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-950/0 text-[10px] font-semibold text-white opacity-0 transition group-hover:bg-ink-950/40 group-hover:opacity-100">
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
              autoFocus
              required
              maxLength={40}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-lg border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
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
              {submitting ? "Mentés…" : "Mentés"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
