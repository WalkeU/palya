export type Stage = "potential" | "discussion" | "building" | "done";

export interface User {
  id: number;
  email: string;
  nickname: string | null;
  role: "superadmin" | "user";
  mustChangePassword: boolean;
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
