export interface Entry {
  id: number;
  content: string;
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
