import { useEffect, useSyncExternalStore } from "react";
import { api } from "../api/client";
import type { AppSettings, StageDef } from "../types";
import { DEFAULT_CUSTOMER_STAGES, DEFAULT_TASK_STAGES } from "../types";

// Customer / task stages are team-wide settings. Every page and panel needs
// them, so they live in one tiny module-level store instead of being fetched
// (or prop-drilled) per component. SettingsModal pushes changes in via
// setStages(); the first useStages() call loads them from /api/settings.

interface StagesState {
  customerStages: StageDef[];
  taskStages: StageDef[];
}

let state: StagesState = {
  customerStages: DEFAULT_CUSTOMER_STAGES,
  taskStages: DEFAULT_TASK_STAGES,
};
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setStages(settings: Pick<AppSettings, "customerStages" | "taskStages">) {
  state = { customerStages: settings.customerStages, taskStages: settings.taskStages };
  loaded = true;
  emit();
}

function load() {
  if (loaded) return;
  loaded = true;
  api<AppSettings>("/api/settings")
    .then(setStages)
    .catch(() => {
      loaded = false;
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useStages(): StagesState {
  useEffect(load, []);
  return useSyncExternalStore(subscribe, () => state);
}

export const FIXED_TASK_ACCENT = { backlog: "#9aa0aa", closed: "#6b7280" } as const;

export function taskStageAccent(stages: StageDef[], key: string): string {
  if (key === "backlog" || key === "closed") return FIXED_TASK_ACCENT[key];
  return stages.find((s) => s.key === key)?.accent ?? "#9aa0aa";
}
