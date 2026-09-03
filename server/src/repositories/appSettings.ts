import { db } from "../db";

export const appSettingsRepo = {
  get(key: string): string | undefined {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as
      | { value: string }
      | undefined;
    return row?.value;
  },

  set(key: string, value: string) {
    db.prepare(
      "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(key, value);
  },

  getBool(key: string, fallback: boolean): boolean {
    const value = this.get(key);
    if (value === undefined) return fallback;
    return value === "1";
  },

  setBool(key: string, value: boolean) {
    this.set(key, value ? "1" : "0");
  },
};
