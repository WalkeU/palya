interface CommentLike {
  id: number;
  author_nickname: string | null;
  author_email: string | null;
  text: string;
  created_at: string;
}

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

export function CommentList({ comments }: { comments: CommentLike[] }) {
  if (comments.length === 0) {
    return (
      <p className="rounded-lg bg-ink-50 px-3 py-4 text-center text-xs text-ink-500">
        Még nincs komment.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="rounded-lg border border-ink-100 bg-surface p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-900">
              {c.author_nickname || c.author_email || "Ismeretlen"}
            </span>
            <span className="text-[11px] text-ink-500">
              {formatRelative(c.created_at)}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink-700">{c.text}</p>
        </div>
      ))}
    </div>
  );
}
