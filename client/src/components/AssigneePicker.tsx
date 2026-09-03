import { useEffect, useRef, useState } from "react";
import type { TeamMember } from "../types";
import { Avatar } from "./Avatar";

export function AssigneePicker({
  members,
  value,
  onChange,
}: {
  members: TeamMember[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = members.find((m) => String(m.id) === value);

  function select(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-ink-100 bg-surface px-3 py-2 text-left text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      >
        {selected ? (
          <>
            <Avatar
              avatar={selected.avatar}
              name={selected.nickname || selected.email}
              size={22}
            />
            <span className="truncate">{selected.nickname || selected.email}</span>
          </>
        ) : (
          <span className="text-ink-500">Nincs hozzárendelve</span>
        )}
        <svg
          className="ml-auto h-4 w-4 shrink-0 text-ink-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-ink-100 bg-surface py-1 shadow-panel">
          <button
            type="button"
            onClick={() => select("")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-500 transition hover:bg-ink-50"
          >
            Nincs hozzárendelve
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => select(String(m.id))}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-900 transition hover:bg-ink-50"
            >
              <Avatar avatar={m.avatar} name={m.nickname || m.email} size={22} />
              <span className="truncate">{m.nickname || m.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
