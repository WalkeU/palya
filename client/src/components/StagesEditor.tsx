import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { setStages } from "../utils/stages";
import type { AppSettings, Customer, StageDef, Task } from "../types";
import { TAG_COLORS } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { SettingsIcon } from "./icons";

/** Local editing row; `uid` is a stable id for React keys and drag-and-drop. */
type Draft = { uid: string; key?: string; label: string; accent: string };

export const MAX_STAGES = 12;
const MAX_LABEL = 30;

// The tag palette plus the two default hues it lacks (Todo's slate blue and a
// neutral gray), so every built-in stage color is pickable from the swatches.
const STAGE_COLORS: string[] = [...TAG_COLORS, "#6b7cae", "#8a919e"];

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 focus-visible:ring-offset-surface";

let uidCounter = 0;
const toDraft = (list: StageDef[]): Draft[] => list.map((s) => ({ uid: s.key, ...s }));

function sameStages(a: { key?: string; label: string; accent: string }[], b: StageDef[]) {
  return (
    a.length === b.length &&
    a.every((s, i) => s.key === b[i].key && s.label === b[i].label && s.accent === b[i].accent)
  );
}

// Only lets the dragged row move up and down, never sideways.
const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * Edits a team-wide ordered stage list (board columns). `field` is the
 * AppSettings key it saves to; `lockedKeys` can be renamed, recolored and
 * moved but not removed; `notes` puts a short explanation under a stage row.
 */
export function StagesEditor({
  field,
  defaults,
  lockedKeys = [],
  notes = {},
  onDirtyChange,
}: {
  field: "customerStages" | "taskStages";
  defaults: StageDef[];
  lockedKeys?: string[];
  notes?: Record<string, string>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { showToast } = useToast();
  const itemNoun = field === "customerStages" ? "ügyfél" : "feladat";

  const [saved, setSaved] = useState<StageDef[]>(defaults);
  const [draft, setDraft] = useState<Draft[]>(() => toDraft(defaults));
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [paletteFor, setPaletteFor] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const [focusUid, setFocusUid] = useState<string | null>(null);

  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(() => {
    setLoadState("loading");
    api<AppSettings>("/api/settings")
      .then((d) => {
        setSaved(d[field]);
        setDraft(toDraft(d[field]));
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [field]);

  useEffect(load, [load]);

  const ready = loadState === "ready";
  const dirty = ready && !sameStages(draft, saved);
  const isDefault = sameStages(draft, defaults);

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!focusUid) return;
    inputRefs.current.get(focusUid)?.focus();
    setFocusUid(null);
  }, [focusUid, draft]);

  // Per-row validation. Duplicates show right away, an empty name only once
  // the row was left or a save was attempted, so a fresh row isn't red.
  const errors = useMemo(() => {
    const out = new Map<string, string>();
    const seen = new Map<string, number>();
    draft.forEach((s) => {
      const n = s.label.trim().toLocaleLowerCase("hu");
      if (n) seen.set(n, (seen.get(n) ?? 0) + 1);
    });
    draft.forEach((s) => {
      const n = s.label.trim().toLocaleLowerCase("hu");
      if (!n) {
        if (submitted || touched.has(s.uid)) out.set(s.uid, "Adj nevet a fázisnak.");
      } else if ((seen.get(n) ?? 0) > 1) {
        out.set(s.uid, "Már van ilyen nevű fázis.");
      }
    });
    return out;
  }, [draft, submitted, touched]);

  const hasBlockingError =
    draft.some((s) => !s.label.trim()) ||
    new Set(draft.map((s) => s.label.trim().toLocaleLowerCase("hu"))).size !== draft.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function labelOf(id: UniqueIdentifier) {
    const s = draft.find((d) => d.uid === id);
    return s?.label.trim() || "Névtelen fázis";
  }
  function positionOf(id: UniqueIdentifier) {
    return draft.findIndex((d) => d.uid === id) + 1;
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `${labelOf(active.id)} felvéve, ${positionOf(active.id)}. hely a ${draft.length}-ból.`,
    onDragOver: ({ active, over }) =>
      over ? `${labelOf(active.id)}: ${positionOf(over.id)}. hely.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${labelOf(active.id)} lerakva a(z) ${positionOf(over.id)}. helyre.`
        : `${labelOf(active.id)} lerakva.`,
    onDragCancel: ({ active }) => `Áthelyezés megszakítva, ${labelOf(active.id)} a helyén maradt.`,
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setDraft((prev) => {
      const from = prev.findIndex((s) => s.uid === active.id);
      const to = prev.findIndex((s) => s.uid === over.id);
      return arrayMove(prev, from, to);
    });
  }

  function patch(uid: string, change: Partial<Draft>) {
    setDraft((prev) => prev.map((s) => (s.uid === uid ? { ...s, ...change } : s)));
    setSaveError(null);
  }

  function add() {
    if (draft.length >= MAX_STAGES) return;
    const uid = `new-${++uidCounter}`;
    // Next palette color that isn't used yet, so new columns stay distinct.
    const used = new Set(draft.map((s) => s.accent.toLowerCase()));
    const accent =
      STAGE_COLORS.find((c) => !used.has(c.toLowerCase())) ??
      STAGE_COLORS[draft.length % STAGE_COLORS.length];
    setDraft((prev) => [...prev, { uid, label: "", accent }]);
    setFocusUid(uid);
  }

  function remove(uid: string) {
    const index = draft.findIndex((s) => s.uid === uid);
    const next = draft.filter((s) => s.uid !== uid);
    setDraft(next);
    if (paletteFor === uid) setPaletteFor(null);
    const neighbour = next[index] ?? next[index - 1];
    if (neighbour) setFocusUid(neighbour.uid);
    else addButtonRef.current?.focus();
  }

  function handleEnter(uid: string) {
    const index = draft.findIndex((s) => s.uid === uid);
    if (index === draft.length - 1) {
      if (draft[index].label.trim()) add();
    } else {
      inputRefs.current.get(draft[index + 1].uid)?.focus();
    }
  }

  function discard() {
    setDraft(toDraft(saved));
    setSubmitted(false);
    setTouched(new Set());
    setSaveError(null);
    setPaletteFor(null);
  }

  function resetToDefaults() {
    setDraft(toDraft(defaults));
    setSubmitted(false);
    setTouched(new Set());
    setSaveError(null);
    setPaletteFor(null);
  }

  async function requestSave() {
    setSubmitted(true);
    setSaveError(null);
    if (hasBlockingError) {
      const firstBad = draft.find(
        (s, i) =>
          !s.label.trim() ||
          draft.findIndex(
            (o) =>
              o.label.trim().toLocaleLowerCase("hu") === s.label.trim().toLocaleLowerCase("hu")
          ) !== i
      );
      if (firstBad) inputRefs.current.get(firstBad.uid)?.focus();
      return;
    }

    // Removing a stage that still holds items moves them to the first stage
    // on the server; say so (with numbers) before it happens.
    const removed = saved.filter((s) => !draft.some((d) => d.key === s.key));
    if (removed.length > 0) {
      setSaving(true);
      let count: number | null = null;
      try {
        const removedKeys = new Set(removed.map((s) => s.key));
        if (field === "customerStages") {
          const d = await api<{ customers: Customer[] }>("/api/customers");
          count = d.customers.filter((c) => removedKeys.has(c.stage)).length;
        } else {
          const d = await api<{ tasks: Task[] }>("/api/tasks");
          count = d.tasks.filter((t) => removedKeys.has(t.stage)).length;
        }
      } catch {
        count = null; // unknown: ask anyway, to be safe
      }
      setSaving(false);
      if (count !== 0) {
        const names = removed.map((s) => `"${s.label}"`).join(", ");
        const target = `"${draft[0].label.trim()}"`;
        const where =
          removed.length === 1 ? `A(z) ${names} fázisban` : `A törölt fázisokban (${names})`;
        setPendingConfirm(
          count === null
            ? `${where} lévő elemek az első fázisba (${target}) kerülnek át.`
            : `${where} ${removed.length === 1 ? "" : "összesen "}${count} ${itemNoun} van. Mentés után az első fázisba (${target}) ${count === 1 ? "kerül" : "kerülnek"} át.`
        );
        return;
      }
    }
    await save();
  }

  async function save() {
    setPendingConfirm(null);
    setSaving(true);
    try {
      const next = await api<AppSettings>("/api/settings", {
        method: "PATCH",
        body: {
          [field]: draft.map((s) => ({
            ...(s.key ? { key: s.key } : {}),
            label: s.label.trim(),
            accent: s.accent,
          })),
        },
      });
      setStages(next);
      setSaved(next[field]);
      setDraft(toDraft(next[field]));
      setSubmitted(false);
      setTouched(new Set());
      setPaletteFor(null);
      showToast("Fázisok elmentve");
    } catch (err) {
      setSaveError(
        err instanceof ApiError && err.status === 400
          ? "A szerver nem fogadta el a listát. Ellenőrizd a neveket, és próbáld újra."
          : "Nem sikerült menteni. Próbáld újra."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div aria-busy="true" aria-label="Fázisok betöltése" className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-ink-100/70" />
        ))}
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-scale-1/10 px-3 py-2.5 text-sm text-scale-1">
        Nem sikerült betölteni a fázisokat.
        <button
          type="button"
          onClick={load}
          className={`rounded-md font-medium underline underline-offset-2 ${focusRing}`}
        >
          Újra
        </button>
      </div>
    );
  }

  const atMax = draft.length >= MAX_STAGES;

  return (
    <div>
      {/* How the columns will read on the board, left to right. */}
      <div className="mb-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Előnézet
        </p>
        <div className="flex gap-x-5 gap-y-2 overflow-x-auto rounded-xl border border-ink-100 bg-ink-50/60 px-3.5 py-3">
          {draft.map((s) => (
            <div key={s.uid} className="flex max-w-[160px] shrink-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.accent }} />
              <span
                className={`truncate text-sm font-semibold ${
                  s.label.trim() ? "text-ink-900" : "italic text-ink-300"
                }`}
              >
                {s.label.trim() || "Névtelen"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={() => setPaletteFor(null)}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Átrendezés: Szóköz vagy Enter a felvételhez, a fel és le nyíllal mozgatod, Szóköz vagy Enter a lerakáshoz, Escape a megszakításhoz.",
          },
        }}
      >
        <SortableContext items={draft.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2" aria-label="Fázisok, balról jobbra">
            {draft.map((s) => (
              <StageRow
                key={s.uid}
                stage={s}
                locked={!!s.key && lockedKeys.includes(s.key)}
                onlyOne={draft.length <= 1}
                note={s.key ? notes[s.key] : undefined}
                error={errors.get(s.uid)}
                paletteOpen={paletteFor === s.uid}
                onTogglePalette={() => setPaletteFor((p) => (p === s.uid ? null : s.uid))}
                onChange={(change) => patch(s.uid, change)}
                onBlur={() =>
                  setTouched((prev) => (prev.has(s.uid) ? prev : new Set(prev).add(s.uid)))
                }
                onEnter={() => handleEnter(s.uid)}
                onRemove={() => remove(s.uid)}
                inputRef={(el) => {
                  if (el) inputRefs.current.set(s.uid, el);
                  else inputRefs.current.delete(s.uid);
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          ref={addButtonRef}
          type="button"
          onClick={add}
          disabled={atMax}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-ink-700 transition hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent sm:min-h-[36px] ${focusRing}`}
        >
          <span aria-hidden="true" className="text-base leading-none">+</span> Új fázis
        </button>
        <span className="text-xs tabular-nums text-ink-500" aria-live="polite">
          {atMax ? `Elérted a maximumot (${MAX_STAGES} fázis).` : `${draft.length} / ${MAX_STAGES}`}
        </span>
      </div>

      {saveError && (
        <div role="alert" className="mt-3 rounded-lg bg-scale-1/10 px-3 py-2 text-sm text-scale-1">
          {saveError}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
        <button
          type="button"
          onClick={resetToDefaults}
          disabled={isDefault || saving}
          className={`min-h-[44px] rounded-lg px-2.5 text-sm font-medium text-ink-500 transition hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-ink-500 sm:min-h-[36px] ${focusRing}`}
        >
          Alapértelmezett fázisok
        </button>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {dirty && (
            <span className="flex items-center gap-1.5 text-xs text-ink-500" aria-live="polite">
              <span className="h-1.5 w-1.5 rounded-full bg-scale-3" aria-hidden="true" />
              Nem mentett módosítások
            </span>
          )}
          {dirty && (
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              className={`min-h-[44px] rounded-lg px-3 text-sm font-medium text-ink-500 transition hover:text-ink-900 disabled:opacity-50 sm:min-h-[36px] ${focusRing}`}
            >
              Elvetés
            </button>
          )}
          <button
            type="button"
            onClick={requestSave}
            disabled={saving || !dirty}
            className={`min-h-[44px] rounded-lg bg-night px-4 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-night sm:min-h-[36px] ${focusRing}`}
          >
            {saving ? "Mentés…" : "Mentés"}
          </button>
        </div>
      </div>

      {pendingConfirm && (
        <ConfirmDialog
          title="Fázis törlése"
          message={pendingConfirm}
          confirmLabel="Mentés és áthelyezés"
          danger
          onConfirm={save}
          onCancel={() => setPendingConfirm(null)}
        />
      )}
    </div>
  );
}

function StageRow({
  stage,
  locked,
  onlyOne,
  note,
  error,
  paletteOpen,
  onTogglePalette,
  onChange,
  onBlur,
  onEnter,
  onRemove,
  inputRef,
}: {
  stage: Draft;
  locked: boolean;
  onlyOne: boolean;
  note?: string;
  error?: string;
  paletteOpen: boolean;
  onTogglePalette: () => void;
  onChange: (change: Partial<Draft>) => void;
  onBlur: () => void;
  onEnter: () => void;
  onRemove: () => void;
  inputRef: (el: HTMLInputElement | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.uid });

  const name = stage.label.trim() || "Névtelen fázis";
  const errorId = `stage-err-${stage.uid}`;
  const noteId = `stage-note-${stage.uid}`;
  const paletteId = `stage-palette-${stage.uid}`;
  const isCustomColor = !STAGE_COLORS.some((c) => c.toLowerCase() === stage.accent.toLowerCase());

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-xl border bg-surface transition-shadow ${
        isDragging ? "relative z-10 border-ink-300 shadow-card-hover" : "border-ink-100"
      }`}
    >
      <div className="flex items-center gap-1 p-1 sm:gap-1.5 sm:p-1.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`${name} áthelyezése`}
          title="Húzd az átrendezéshez"
          className={`flex h-11 w-6 shrink-0 touch-none items-center justify-center rounded-md text-ink-300 transition hover:bg-ink-50 hover:text-ink-500 sm:h-9 sm:w-7 ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          } ${focusRing}`}
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
            {[3, 8, 13].map((y) => (
              <g key={y}>
                <circle cx="3.5" cy={y} r="1.4" />
                <circle cx="8.5" cy={y} r="1.4" />
              </g>
            ))}
          </svg>
        </button>

        <button
          type="button"
          onClick={onTogglePalette}
          aria-expanded={paletteOpen}
          aria-controls={paletteId}
          aria-label={`${name} színe`}
          title="Szín"
          className={`flex h-11 w-9 shrink-0 items-center justify-center rounded-lg transition hover:bg-ink-50 sm:h-9 ${
            paletteOpen ? "bg-ink-50" : ""
          } ${focusRing}`}
        >
          <span
            className="h-5 w-5 rounded-full ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: stage.accent }}
          />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={stage.label}
          maxLength={MAX_LABEL}
          placeholder="Fázis neve"
          aria-label="Fázis neve"
          aria-invalid={!!error}
          aria-describedby={[error ? errorId : null, note ? noteId : null].filter(Boolean).join(" ") || undefined}
          autoComplete="off"
          enterKeyHint="next"
          onChange={(e) => onChange({ label: e.target.value })}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          className={`h-11 min-w-0 flex-1 rounded-lg border bg-ink-50/60 px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-300 focus:bg-surface focus:ring-2 sm:h-9 ${
            error
              ? "border-scale-1/60 focus:border-scale-1 focus:ring-scale-1/20"
              : "border-ink-100 focus:border-brand-400 focus:ring-brand-100"
          }`}
        />

        {locked ? (
          <span
            title="Nem törölhető"
            className="flex h-11 w-9 shrink-0 items-center justify-center text-ink-300 sm:h-9"
          >
            <SettingsIcon name="lock" size={15} />
            <span className="sr-only">Nem törölhető</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            disabled={onlyOne}
            aria-label={`${name} törlése`}
            title={onlyOne ? "Legalább egy fázisnak maradnia kell" : "Törlés"}
            className={`flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 transition hover:bg-scale-1/10 hover:text-scale-1 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-500 sm:h-9 sm:w-9 ${focusRing}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </div>

      {(error || note) && (
        <div className="space-y-0.5 px-3 pb-2 sm:pl-[5.125rem]">
          {error && (
            <p id={errorId} className="text-xs text-scale-1">
              {error}
            </p>
          )}
          {note && (
            <p id={noteId} className="flex items-start gap-1.5 text-xs text-ink-500">
              {locked && <SettingsIcon name="lock" size={11} className="mt-0.5 shrink-0" />}
              {note}
            </p>
          )}
        </div>
      )}

      {paletteOpen && (
        <div
          id={paletteId}
          role="group"
          aria-label={`${name} színe`}
          className="flex flex-wrap items-center gap-1.5 border-t border-ink-100 px-3 py-2.5 sm:pl-[5.125rem]"
        >
          {STAGE_COLORS.map((c) => {
            const selected = c.toLowerCase() === stage.accent.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ accent: c })}
                aria-pressed={selected}
                aria-label={`Szín ${c}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition sm:h-8 sm:w-8 ${focusRing}`}
              >
                <span
                  className="h-6 w-6 rounded-full"
                  style={{
                    backgroundColor: c,
                    boxShadow: selected
                      ? "0 0 0 2px rgb(var(--surface)), 0 0 0 4px rgb(var(--ink-700))"
                      : undefined,
                  }}
                />
              </button>
            );
          })}
          <label
            title="Egyéni szín"
            className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full focus-within:ring-2 focus-within:ring-brand-400 sm:h-8 sm:w-8"
          >
            <span
              className="h-6 w-6 rounded-full"
              style={{
                background: isCustomColor
                  ? stage.accent
                  : "conic-gradient(#e0564b, #e0b84b, #8fbf5a, #4d7ea8, #7c6bb0, #c15b8c, #e0564b)",
                boxShadow: isCustomColor
                  ? "0 0 0 2px rgb(var(--surface)), 0 0 0 4px rgb(var(--ink-700))"
                  : undefined,
              }}
            />
            <input
              type="color"
              value={stage.accent}
              onChange={(e) => onChange({ accent: e.target.value })}
              aria-label="Egyéni szín"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      )}
    </li>
  );
}
