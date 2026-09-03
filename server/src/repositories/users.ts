import { db } from "../db";

export type Role = "superadmin" | "user";

export interface User {
  id: number;
  email: string;
  nickname: string | null;
  password_hash: string;
  role: Role;
  must_change_password: number;
  avatar: string | null;
  created_at: string;
}

export interface Member {
  id: number;
  nickname: string | null;
  email: string;
  avatar: string | null;
}

export const usersRepo = {
  findByEmail(email: string): User | undefined {
    return db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email.trim().toLowerCase()) as User | undefined;
  },

  findById(id: number): User | undefined {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | User
      | undefined;
  },

  list(): Omit<User, "password_hash">[] {
    return db
      .prepare(
        "SELECT id, email, nickname, role, must_change_password, avatar, created_at FROM users ORDER BY created_at ASC"
      )
      .all() as Omit<User, "password_hash">[];
  },

  listMembers(): Member[] {
    return db
      .prepare(
        "SELECT id, nickname, email, avatar FROM users ORDER BY COALESCE(nickname, email) ASC"
      )
      .all() as Member[];
  },

  create(email: string, passwordHash: string, role: Role): User {
    const info = db
      .prepare(
        `INSERT INTO users (email, nickname, password_hash, role, must_change_password)
         VALUES (?, NULL, ?, ?, 1)`
      )
      .run(email.trim().toLowerCase(), passwordHash, role);
    return this.findById(info.lastInsertRowid as number)!;
  },

  completeFirstLogin(id: number, passwordHash: string, nickname: string) {
    db.prepare(
      `UPDATE users SET password_hash = ?, nickname = ?, must_change_password = 0 WHERE id = ?`
    ).run(passwordHash, nickname, id);
  },

  resetPassword(id: number, passwordHash: string) {
    db.prepare(
      `UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?`
    ).run(passwordHash, id);
  },

  updateProfile(id: number, nickname: string, avatar: string | null) {
    db.prepare(`UPDATE users SET nickname = ?, avatar = ? WHERE id = ?`).run(
      nickname,
      avatar,
      id
    );
  },
};
