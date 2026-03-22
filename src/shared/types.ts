export type Category = "focus_1" | "focus_2" | "focus_3" | "maintenance";

export const FOCUS_LEVELS = [
  { value: "focus_1" as Category, label: "1" },
  { value: "focus_2" as Category, label: "2" },
  { value: "focus_3" as Category, label: "3" },
];

export interface Entry {
  id: number;
  content: string;
  category: Category | null;
  interval_start: number; // Unix ms
  interval_end: number;   // Unix ms
  created_at: number;     // Unix ms
}

export interface Config {
  intervalMs: number;
  launchAtLogin: boolean;
}

export const DEFAULT_CONFIG: Config = {
  intervalMs: 15 * 60 * 1000,
  launchAtLogin: false,
};
