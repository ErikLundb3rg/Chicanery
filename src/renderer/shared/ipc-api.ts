import type { Entry, EntryUpdate, Config, TaskState } from "../../shared/types";

interface ElectronAPI {
  updateEntry: (id: number, update: EntryUpdate) => Promise<Entry>;
  submitEntry: (content: string, intervalStart: number, intervalEnd: number, category: string | null) => Promise<Entry>;
  hasEntryForInterval: (intervalStart: number, intervalEnd: number) => Promise<boolean>;
  getEntriesForToday: () => Promise<Entry[]>;
  getEntriesForRange: (start: number, end: number) => Promise<Entry[]>;
  getConfig: () => Promise<Config>;
  setConfig: (config: Partial<Config>) => Promise<void>;
  closePrompt: () => void;
  snooze: (minutes: number) => void;
  onNewPrompt: (callback: (intervalStart: number, intervalEnd: number) => void) => () => void;
  closeTask: () => void;
  startTask: (taskName: string, durationMinutes: number) => Promise<TaskState>;
  getTaskState: () => Promise<TaskState | null>;
  onTaskState: (callback: (state: TaskState | null) => void) => () => void;
  onTaskShow: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export const api = window.electronAPI;
