import { FormEvent, useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AppSettings, Link, Note, PollType } from "../types";
import { TAG_COLORS } from "../types";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { TopBar } from "../components/TopBar";
import { Avatar } from "../components/Avatar";
import { LinkIcon } from "../components/icons";

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
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollType, setPollType] = useState<PollType>("single");
  const [options, setOptions] = useState<string[]>(["", ""]);

  function updateOption(idx: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  }
  function addOption() {
    setOptions((prev) => (prev.length >= 10 ? prev : [...prev, ""]));
  }
  function removeOption(idx: number) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));
  }

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = !!text.trim() && (!pollEnabled || validOptions.length >= 2);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const data = await api<{ note: Note }>("/api/notes", {
        method: "POST",
        body: {
          text: text.trim(),
          color,
          poll: pollEnabled ? { type: pollType, options: validOptions } : undefined,
        },
      });
      onCreated(data.note);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-2.5 rounded-xl border border-ink-100 bg-surface p-3.5 shadow-card ${
        pollEnabled ? "w-64" : "w-[210px]"
      }`}
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={pollEnabled ? 2 : 3}
        maxLength={500}
        placeholder={pollEnabled ? "Miről szavazunk?" : "pl. Mikor lesz a következő meeting?"}
        className="w-full resize-none rounded-lg border border-ink-100 bg-ink-50/60 px-2.5 py-2 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
      />

      {!pollEnabled ? (
        <button
          type="button"
          onClick={() => setPollEnabled(true)}
          className="self-start text-xs font-medium text-brand-600 transition hover:text-brand-500"
        >
          + Szavazás hozzáadása
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-ink-100 bg-ink-50/60 p-2.5">
          <div className="flex items-center gap-1.5">
            {(["single", "multiple"] as PollType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPollType(t)}
                className="rounded-md border px-2 py-1 text-[11px] font-medium transition"
                style={{
                  borderColor: pollType === t ? "#3a8a74" : "rgb(var(--ink-100))",
                  backgroundColor:
                    pollType === t ? "rgb(var(--brand-100))" : "rgb(var(--surface))",
                  color: pollType === t ? "#2f6f5e" : "rgb(var(--ink-700))",
                }}
              >
                {t === "single" ? "Egy válasz" : "Több válasz"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPollEnabled(false);
                setOptions(["", ""]);
              }}
              className="ml-auto text-[11px] text-ink-500 transition hover:text-scale-1"
            >
              Szavazás törlése
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  maxLength={120}
                  placeholder={`Opció ${idx + 1}`}
                  className="min-w-0 flex-1 rounded-md border border-ink-100 bg-surface px-2 py-1.5 text-xs outline-none transition focus:border-brand-400"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    aria-label="Opció törlése"
                    className="shrink-0 text-ink-500 transition hover:text-scale-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <button
              type="button"
              onClick={addOption}
              className="self-start text-[11px] font-medium text-ink-500 transition hover:text-ink-900"
            >
              + Opció
            </button>
          )}
        </div>
      )}

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
          disabled={submitting || !canSubmit}
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
  const [voting, setVoting] = useState<number | null>(null);
  const [editingPoll, setEditingPoll] = useState(false);
  const [pollDraft, setPollDraft] = useState<{ id?: number; text: string }[]>([]);
  const [savingPoll, setSavingPoll] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: note.id });

  const isPoll = !!note.poll_type;
  const totalVotes = isPoll
    ? note.poll_options.reduce((sum, o) => sum + o.voteCount, 0)
    : 0;

  function startEditPoll() {
    setPollDraft(note.poll_options.map((o) => ({ id: o.id, text: o.text })));
    setEditingPoll(true);
  }
  function updateDraftOption(idx: number, value: string) {
    setPollDraft((prev) => prev.map((o, i) => (i === idx ? { ...o, text: value } : o)));
  }
  function addDraftOption() {
    setPollDraft((prev) => (prev.length >= 10 ? prev : [...prev, { text: "" }]));
  }
  function removeDraftOption(idx: number) {
    setPollDraft((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));
  }
  const validDraft = pollDraft.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text);
  const canSavePoll = validDraft.length >= 2;

  async function savePollOptions() {
    if (!canSavePoll) return;
    setSavingPoll(true);
    try {
      const data = await api<{ note: Note }>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: { pollOptions: validDraft },
      });
      onUpdated(data.note);
      setEditingPoll(false);
    } finally {
      setSavingPoll(false);
    }
  }

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

  async function handleVote(optionId: number) {
    setVoting(optionId);
    try {
      const data = await api<{ note: Note }>(`/api/notes/${note.id}/vote`, {
        method: "POST",
        body: { optionId },
      });
      onUpdated(data.note);
    } finally {
      setVoting(null);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderColor: `${note.color}55`,
        backgroundColor: `${note.color}14`,
      }}
      className={`group relative flex flex-col gap-2.5 rounded-xl border p-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${
        isPoll ? "w-64" : "w-[210px]"
      } ${rotation}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Jegyzet mozgatása"
        className="absolute -left-1.5 -top-1.5 hidden h-5 w-5 cursor-grab items-center justify-center rounded-full bg-ink-700 text-white group-hover:flex active:cursor-grabbing"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      </button>
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
          className={`cursor-text whitespace-pre-wrap text-sm text-ink-900 ${
            isPoll ? "font-semibold" : "min-h-[3.5em]"
          }`}
        >
          {note.text}
        </p>
      )}

      {isPoll && editingPoll && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-ink-100 bg-ink-50/60 p-2.5">
          {pollDraft.map((opt, idx) => (
            <div key={opt.id ?? `new-${idx}`} className="flex items-center gap-1.5">
              <input
                value={opt.text}
                onChange={(e) => updateDraftOption(idx, e.target.value)}
                maxLength={120}
                placeholder={`Opció ${idx + 1}`}
                className="min-w-0 flex-1 rounded-md border border-ink-100 bg-surface px-2 py-1.5 text-xs outline-none transition focus:border-brand-400"
              />
              {pollDraft.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeDraftOption(idx)}
                  aria-label="Opció törlése"
                  className="shrink-0 text-ink-500 transition hover:text-scale-1"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {pollDraft.length < 10 && (
            <button
              type="button"
              onClick={addDraftOption}
              className="self-start text-[11px] font-medium text-ink-500 transition hover:text-ink-900"
            >
              + Opció
            </button>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingPoll(false)}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-500 transition hover:text-ink-900"
            >
              Mégse
            </button>
            <button
              type="button"
              onClick={savePollOptions}
              disabled={savingPoll || !canSavePoll}
              className="rounded-md bg-night px-3 py-1 text-xs font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              Mentés
            </button>
          </div>
        </div>
      )}

      {isPoll && !editingPoll && (
        <div className="flex flex-col gap-1.5">
          {note.poll_options.map((opt) => {
            const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleVote(opt.id)}
                disabled={voting === opt.id}
                className="relative overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-xs transition disabled:opacity-70"
                style={{
                  borderColor: opt.votedByMe ? note.color : "rgb(var(--ink-100))",
                  backgroundColor: "rgb(var(--surface))",
                }}
              >
                <span
                  className="absolute inset-y-0 left-0 transition-all"
                  style={{ width: `${pct}%`, backgroundColor: `${note.color}2a` }}
                />
                <span className="relative flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={`h-3 w-3 shrink-0 border ${
                        note.poll_type === "single" ? "rounded-full" : "rounded-[3px]"
                      }`}
                      style={{
                        borderColor: opt.votedByMe ? note.color : "rgb(var(--ink-300))",
                        backgroundColor: opt.votedByMe ? note.color : "transparent",
                      }}
                    />
                    <span className="truncate text-ink-900">{opt.text}</span>
                  </span>
                  <span className="shrink-0 font-medium text-ink-500">{opt.voteCount}</span>
                </span>
              </button>
            );
          })}
          <p className="flex items-center justify-between text-[10px] text-ink-500">
            <span>
              {totalVotes} szavazat ·{" "}
              {note.poll_type === "single" ? "egy válasz adható" : "több válasz is adható"}
            </span>
            <button
              type="button"
              onClick={startEditPoll}
              className="shrink-0 font-medium text-ink-500 underline-offset-2 transition hover:text-ink-900 hover:underline"
            >
              Opciók szerkesztése
            </button>
          </p>
        </div>
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

function TrashDropzone() {
  const { setNodeRef, isOver } = useDroppable({ id: "trash" });
  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium transition"
      style={{
        borderColor: isOver ? "#c85a4a" : "rgb(var(--ink-300))",
        backgroundColor: isOver ? "#c85a4a1f" : "transparent",
        color: isOver ? "#c85a4a" : "rgb(var(--ink-500))",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Húzd ide a törléshez
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
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const activeNote = notes.find((n) => n.id === activeId) || null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    if (over.id === "trash") {
      setNotes((prev) => prev.filter((n) => n.id !== active.id));
      await api(`/api/notes/${active.id}`, { method: "DELETE" });
      return;
    }

    if (active.id === over.id) return;
    const oldIndex = notes.findIndex((n) => n.id === active.id);
    const newIndex = notes.findIndex((n) => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(notes, oldIndex, newIndex);
    setNotes(reordered);
    const data = await api<{ notes: Note[] }>("/api/notes/reorder", {
      method: "PATCH",
      body: { orderedIds: reordered.map((n) => n.id) },
    });
    setNotes(data.notes);
  }

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
                      <LinkIcon name={l.icon} className="shrink-0 text-ink-500" />
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
                {activeId !== null ? (
                  <TrashDropzone />
                ) : (
                  !composing && (
                    <button
                      onClick={() => setComposing(true)}
                      className="rounded-lg bg-night px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                    >
                      + Új jegyzet
                    </button>
                  )
                )}
              </div>

              {loading ? (
                <div className="py-12 text-center text-sm text-ink-500">Betöltés…</div>
              ) : (
                <DndContext
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={notes.map((n) => n.id)}
                    strategy={rectSortingStrategy}
                  >
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
                          onDeleted={(id) =>
                            setNotes((prev) => prev.filter((p) => p.id !== id))
                          }
                        />
                      ))}
                      {!composing && notes.length === 0 && (
                        <p className="text-sm text-ink-500">
                          Még nincs egy jegyzet sem. Írj egyet a "+ Új jegyzet" gombbal.
                        </p>
                      )}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeNote && (
                      <div
                        className={`rotate-2 rounded-xl border p-3.5 shadow-card-hover ${
                          activeNote.poll_type ? "w-64" : "w-[210px]"
                        }`}
                        style={{
                          borderColor: `${activeNote.color}55`,
                          backgroundColor: `${activeNote.color}14`,
                        }}
                      >
                        <p className="whitespace-pre-wrap text-sm text-ink-900">
                          {activeNote.text}
                        </p>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
