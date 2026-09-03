export type Stage = "potential" | "discussion" | "building" | "done";
export type ClosedReason = "not_interested" | "failed";

export interface User {
  id: number;
  email: string;
  nickname: string | null;
  role: "superadmin" | "user";
  mustChangePassword: boolean;
  avatar: string | null;
}

export interface Customer {
  id: number;
  name: string | null;
  business: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  stage: Stage;
  priority: number | null;
  motivation: number | null;
  position: number;
  closed_reason: ClosedReason | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
}

export interface Comment {
  id: number;
  customer_id: number;
  author_id: number | null;
  author_nickname: string | null;
  author_email: string | null;
  text: string;
  created_at: string;
}

export const STAGES: { key: Stage; label: string; accent: string }[] = [
  { key: "potential", label: "Potenciál", accent: "#d99a3d" },
  { key: "discussion", label: "Egyeztetés", accent: "#4d7ea8" },
  { key: "building", label: "Kiépítés alatt", accent: "#7c6bb0" },
  { key: "done", label: "Kész", accent: "#3a8a74" },
];

export const CLOSED_REASONS: { key: ClosedReason; label: string; accent: string }[] = [
  { key: "not_interested", label: "Nem érdekli", accent: "#9a8a4a" },
  { key: "failed", label: "Meghiúsult", accent: "#c85a4a" },
];

export type TaskStage =
  | "backlog"
  | "todo"
  | "in_progress"
  | "blocked"
  | "waiting_review"
  | "done"
  | "closed";

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export const TAG_COLORS = [
  "#d99a3d",
  "#4d7ea8",
  "#7c6bb0",
  "#3a8a74",
  "#c85a4a",
  "#c15b8c",
] as const;

export interface Task {
  id: number;
  title: string;
  description: string | null;
  stage: TaskStage;
  assignee_id: number | null;
  assignee_nickname: string | null;
  assignee_email: string | null;
  assignee_avatar: string | null;
  position: number;
  created_by: number | null;
  creator_nickname: string | null;
  creator_email: string | null;
  creator_avatar: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface Note {
  id: number;
  text: string;
  color: string;
  created_by: number | null;
  author_nickname: string | null;
  author_email: string | null;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface Link {
  id: number;
  label: string;
  url: string;
  icon: string | null;
  position: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  linksEnabled: boolean;
}

export interface TeamMember {
  id: number;
  nickname: string | null;
  email: string;
  avatar: string | null;
}

export const TASK_STAGES: { key: TaskStage; label: string; accent: string }[] = [
  { key: "todo", label: "Todo", accent: "#6b7cae" },
  { key: "in_progress", label: "Work in Progress", accent: "#d99a3d" },
  { key: "blocked", label: "Blocked", accent: "#c85a4a" },
  { key: "waiting_review", label: "Waiting for review", accent: "#7c6bb0" },
  { key: "done", label: "Done", accent: "#3a8a74" },
];
