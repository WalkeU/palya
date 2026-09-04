import { db } from "../db";

export type PollType = "single" | "multiple";

export interface PollOption {
  id: number;
  text: string;
  position: number;
  voteCount: number;
  votedByMe: boolean;
}

export interface Note {
  id: number;
  text: string;
  color: string;
  poll_type: PollType | null;
  position: number;
  created_by: number | null;
  author_nickname: string | null;
  author_email: string | null;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
  poll_options: PollOption[];
}

const SELECT_NOTE = `
  SELECT n.*, u.nickname as author_nickname, u.email as author_email, u.avatar as author_avatar
  FROM notes n
  LEFT JOIN users u ON u.id = n.created_by
`;

function attachPolls(
  rows: Omit<Note, "poll_options">[],
  userId: number | null
): Note[] {
  const noteIds = rows.filter((r) => r.poll_type).map((r) => r.id);
  if (noteIds.length === 0) {
    return rows.map((r) => ({ ...r, poll_options: [] }));
  }

  const notePlaceholders = noteIds.map(() => "?").join(",");
  const options = db
    .prepare(
      `SELECT po.id, po.note_id, po.text, po.position,
              (SELECT COUNT(*) FROM poll_votes v WHERE v.option_id = po.id) as voteCount
       FROM poll_options po
       WHERE po.note_id IN (${notePlaceholders})
       ORDER BY po.position ASC, po.id ASC`
    )
    .all(...noteIds) as {
    id: number;
    note_id: number;
    text: string;
    position: number;
    voteCount: number;
  }[];

  let myVotes = new Set<number>();
  if (userId && options.length > 0) {
    const optionIds = options.map((o) => o.id);
    const optionPlaceholders = optionIds.map(() => "?").join(",");
    const voteRows = db
      .prepare(
        `SELECT option_id FROM poll_votes WHERE user_id = ? AND option_id IN (${optionPlaceholders})`
      )
      .all(userId, ...optionIds) as { option_id: number }[];
    myVotes = new Set(voteRows.map((v) => v.option_id));
  }

  const byNote = new Map<number, PollOption[]>();
  for (const o of options) {
    const list = byNote.get(o.note_id) ?? [];
    list.push({
      id: o.id,
      text: o.text,
      position: o.position,
      voteCount: o.voteCount,
      votedByMe: myVotes.has(o.id),
    });
    byNote.set(o.note_id, list);
  }

  return rows.map((r) => ({ ...r, poll_options: byNote.get(r.id) ?? [] }));
}

export const notesRepo = {
  list(userId: number | null): Note[] {
    const rows = db
      .prepare(`${SELECT_NOTE} ORDER BY n.position ASC, n.id ASC`)
      .all() as Omit<Note, "poll_options">[];
    return attachPolls(rows, userId);
  },

  findById(id: number, userId: number | null = null): Note | undefined {
    const row = db.prepare(`${SELECT_NOTE} WHERE n.id = ?`).get(id) as
      | Omit<Note, "poll_options">
      | undefined;
    if (!row) return undefined;
    return attachPolls([row], userId)[0];
  },

  nextPosition(): number {
    // New notes are prepended (shown first) - one below the current lowest
    // position keeps that ordering without renumbering existing notes.
    const row = db
      .prepare("SELECT COALESCE(MIN(position), 0) - 1 as pos FROM notes")
      .get() as { pos: number };
    return row.pos;
  },

  create(
    text: string,
    color: string,
    createdBy: number | null,
    poll?: { type: PollType; options: string[] }
  ): Note {
    const position = this.nextPosition();
    const tx = db.transaction(() => {
      const info = db
        .prepare(
          "INSERT INTO notes (text, color, created_by, poll_type, position) VALUES (?, ?, ?, ?, ?)"
        )
        .run(text, color, createdBy, poll?.type ?? null, position);
      const id = info.lastInsertRowid as number;
      if (poll) {
        const stmt = db.prepare(
          "INSERT INTO poll_options (note_id, text, position) VALUES (?, ?, ?)"
        );
        poll.options.forEach((opt, idx) => stmt.run(id, opt, idx));
      }
      return id;
    });
    const id = tx();
    return this.findById(id, createdBy)!;
  },

  reorder(orderedIds: number[]) {
    const stmt = db.prepare(
      "UPDATE notes SET position = ?, updated_at = datetime('now') WHERE id = ?"
    );
    const tx = db.transaction((ids: number[]) => {
      ids.forEach((id, index) => stmt.run(index, id));
    });
    tx(orderedIds);
  },

  update(id: number, patch: { text?: string; color?: string }): Note | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    const text = patch.text !== undefined ? patch.text : existing.text;
    const color = patch.color !== undefined ? patch.color : existing.color;
    db.prepare(
      "UPDATE notes SET text = ?, color = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(text, color, id);
    return this.findById(id);
  },

  remove(id: number) {
    db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  },

  vote(noteId: number, optionId: number, userId: number): Note | undefined {
    const noteRow = db
      .prepare("SELECT poll_type FROM notes WHERE id = ?")
      .get(noteId) as { poll_type: PollType | null } | undefined;
    if (!noteRow || !noteRow.poll_type) return undefined;
    const pollType = noteRow.poll_type;

    const option = db
      .prepare("SELECT id FROM poll_options WHERE id = ? AND note_id = ?")
      .get(optionId, noteId);
    if (!option) return undefined;

    const tx = db.transaction(() => {
      const alreadyVoted = db
        .prepare("SELECT 1 FROM poll_votes WHERE option_id = ? AND user_id = ?")
        .get(optionId, userId);

      if (pollType === "single") {
        db.prepare(
          `DELETE FROM poll_votes WHERE user_id = ? AND option_id IN (SELECT id FROM poll_options WHERE note_id = ?)`
        ).run(userId, noteId);
        if (!alreadyVoted) {
          db.prepare(
            "INSERT INTO poll_votes (option_id, user_id) VALUES (?, ?)"
          ).run(optionId, userId);
        }
      } else if (alreadyVoted) {
        db.prepare(
          "DELETE FROM poll_votes WHERE option_id = ? AND user_id = ?"
        ).run(optionId, userId);
      } else {
        db.prepare(
          "INSERT INTO poll_votes (option_id, user_id) VALUES (?, ?)"
        ).run(optionId, userId);
      }
    });
    tx();

    return this.findById(noteId, userId);
  },
};
