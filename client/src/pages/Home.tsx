import { FormEvent, useEffect, useState } from "react";
import type { AppSettings, Link, Note } from "../types";
import { TAG_COLORS } from "../types";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { TopBar } from "../components/TopBar";
import { Avatar } from "../components/Avatar";

function formatRelative(iso: string): string {
  const date = new Date(iso + "Z");
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "most";
  if (mins < 60) return `${mins} perce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} órája`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} napja`;
  return date.toLocaleDateString("hu-HU");
}

const ROTATIONS = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2", "rotate-0"];

function NoteComposer({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (n: Note) => void;
}) {
  const [text, setText] = useState("");
  const [color, setColor] = useState<string>(TAG_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const data = await api<{ note: Note }>("/api/notes", {
        method: "POST",
        body: { text: text.trim(), color },
      });
      onCreated(data.note);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-[210px] flex-col gap-2.5 rounded-xl border border-ink-100 bg-surface p-3.5 shadow-card"
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="pl. Mikor lesz a következő meeting?"
        className="w-full resize-none rounded-lg border border-ink-100 bg-ink-50/60 px-2.5 py-2 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className="h-5 w-5 rounded-full border-2 transition"
              style={{
                backgroundColor: c,
                borderColor: color === c ? "rgb(var(--ink-700))" : "transparent",
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-500 transition hover:text-ink-900"
        >
          Mégse
        </button>
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="rounded-md bg-night px-3 py-1 text-xs font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          Mentés
        </button>
      </div>
    </form>
  );
}

function NoteBubble({
  note,
  rotation,
  onUpdated,
  onDeleted,
}: {
  note: Note;
  rotation: string;
  onUpdated: (n: Note) => void;
  onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);

  async function persist() {
    const trimmed = text.trim();
    if (!trimmed || trimmed === note.text) {
      setText(note.text);
      setEditing(false);
      return;
    }
    const data = await api<{ note: Note }>(`/api/notes/${note.id}`, {
      method: "PATCH",
      body: { text: trimmed },
    });
    onUpdated(data.note);
    setEditing(false);
  }

  async function handleDelete() {
    await api(`/api/notes/${note.id}`, { method: "DELETE" });
    onDeleted(note.id);
  }

  return (
    <div
      className={`group relative flex w-[210px] flex-col gap-2.5 rounded-xl border p-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${rotation}`}
      style={{ borderColor: `${note.color}55`, backgroundColor: `${note.color}14` }}
    >
      <button
        onClick={handleDelete}
        aria-label="Jegyzet törlése"
        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-night text-[10px] text-white group-hover:flex"
      >
        ×
      </button>

      {editing ? (
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={persist}
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-lg border border-ink-100 bg-surface px-2 py-1.5 text-sm text-ink-900 outline-none focus:border-brand-400"
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="min-h-[3.5em] cursor-text whitespace-pre-wrap text-sm text-ink-900"
        >
          {note.text}
        </p>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
        <Avatar
          avatar={note.author_avatar}
          name={note.author_nickname || note.author_email}
          size={16}
        />
        <span className="truncate">
          {note.author_nickname || note.author_email || "Ismeretlen"} · {formatRelative(note.updated_at)}
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ linksEnabled: true });
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ notes: Note[] }>("/api/notes"),
      api<{ links: Link[] }>("/api/links"),
      api<AppSettings>("/api/settings"),
    ]).then(([noteData, linkData, settingsData]) => {
      setNotes(noteData.notes);
      setLinks(linkData.links);
      setSettings(settingsData);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <TopBar />

      <main className="flex-1 overflow-y-auto px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-scale-1" />
              <span className="h-2.5 w-2.5 rounded-full bg-scale-3" />
              <span className="h-3 w-3 rounded-full bg-scale-5" />
            </div>
            <h1 className="font-display text-3xl font-medium text-ink-950">Pálya</h1>
            <p className="mt-1.5 text-sm text-ink-500">
              Szia{user?.nickname ? `, ${user.nickname}` : ""}! Itt a csapat közös jegyzetei.
            </p>
          </div>

          <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
            {settings.linksEnabled && links.length > 0 && (
              <div className="w-full shrink-0 sm:w-52">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Linkek
                </h2>
                <div className="flex flex-col gap-2">
                  {links.map((l) => (
                    <a
                      key={l.id}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-ink-100 bg-surface px-3.5 py-2 text-sm font-medium text-ink-900 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
                    >
                      <span className="text-base leading-none">{l.icon || "🔗"}</span>
                      <span className="truncate">{l.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Jegyzetek
                </h2>
                {!composing && (
                  <button
                    onClick={() => setComposing(true)}
                    className="rounded-lg bg-night px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                  >
                    + Új jegyzet
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-12 text-center text-sm text-ink-500">Betöltés…</div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {composing && (
                    <NoteComposer
                      onCancel={() => setComposing(false)}
                      onCreated={(n) => {
                        setNotes((prev) => [n, ...prev]);
                        setComposing(false);
                      }}
                    />
                  )}
                  {notes.map((n, i) => (
                    <NoteBubble
                      key={n.id}
                      note={n}
                      rotation={ROTATIONS[i % ROTATIONS.length]}
                      onUpdated={(updated) =>
                        setNotes((prev) =>
                          prev.map((p) => (p.id === updated.id ? updated : p))
                        )
                      }
                      onDeleted={(id) => setNotes((prev) => prev.filter((p) => p.id !== id))}
                    />
                  ))}
                  {!composing && notes.length === 0 && (
                    <p className="text-sm text-ink-500">
                      Még nincs egy jegyzet sem. Írj egyet a "+ Új jegyzet" gombbal.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
