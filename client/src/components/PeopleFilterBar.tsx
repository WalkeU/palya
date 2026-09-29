import type { TeamMember } from "../types";
import { Avatar } from "./Avatar";

export type PersonFilter = number | "unassigned" | null;

export function PeopleFilterBar({
  members,
  selectedId,
  onSelect,
}: {
  members: TeamMember[];
  selectedId: PersonFilter;
  onSelect: (id: PersonFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className="rounded-full px-3 py-1 text-xs font-medium transition"
        style={{
          backgroundColor: selectedId === null ? "rgb(var(--night))" : "rgb(var(--ink-100))",
          color: selectedId === null ? "white" : "rgb(var(--ink-700))",
        }}
      >
        Mind
      </button>
      <button
        onClick={() => onSelect(selectedId === "unassigned" ? null : "unassigned")}
        title="Nincs hozzárendelve"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed transition"
        style={{
          borderColor: selectedId === "unassigned" ? "#3a8a74" : "rgb(var(--ink-300))",
          backgroundColor:
            selectedId === "unassigned" ? "rgb(var(--brand-100))" : "transparent",
          opacity: selectedId !== null && selectedId !== "unassigned" ? 0.4 : 1,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="rgb(var(--ink-500))"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {members.map((m) => {
        const active = selectedId === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(active ? null : m.id)}
            title={m.nickname || m.email}
            className="rounded-full p-0.5 transition"
            style={{
              boxShadow: active ? "0 0 0 2px #3a8a74" : "0 0 0 2px transparent",
              opacity: selectedId !== null && !active ? 0.4 : 1,
            }}
          >
            <Avatar avatar={m.avatar} name={m.nickname || m.email} size={28} />
          </button>
        );
      })}
    </div>
  );
}
