import type { TeamMember } from "../types";
import { Avatar } from "./Avatar";

export function PeopleFilterBar({
  members,
  selectedId,
  onSelect,
}: {
  members: TeamMember[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
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
