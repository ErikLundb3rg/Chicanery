import type { Entry, Config } from "../../shared/types";

interface ElectronAPI {
  submitEntry: (content: string, intervalStart: number, intervalEnd: number) => Promise<Entry>;
  getEntriesForToday: () => Promise<Entry[]>;
  getEntriesForRange: (start: number, end: number) => Promise<Entry[]>;
  getConfig: () => Promise<Config>;
  setConfig: (config: Partial<Config>) => Promise<void>;
  closePrompt: () => void;
  snooze: (minutes: number) => void;
  onNewPrompt: (callback: (intervalStart: number, intervalEnd: number) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export const api = window.electronAPI;
