import { contextBridge, ipcRenderer } from "electron";
import type { Entry, EntryUpdate, Config, TaskState } from "../../shared/types";

contextBridge.exposeInMainWorld("electronAPI", {
  updateEntry: (id: number, update: EntryUpdate): Promise<Entry> =>
    ipcRenderer.invoke("entries:update", id, update),
  submitEntry: (content: string, intervalStart: number, intervalEnd: number, category: string | null): Promise<Entry> =>
    ipcRenderer.invoke("entries:add", content, intervalStart, intervalEnd, category),

  hasEntryForInterval: (intervalStart: number, intervalEnd: number): Promise<boolean> =>
    ipcRenderer.invoke("entries:hasForInterval", intervalStart, intervalEnd),

  getEntriesForToday: (): Promise<Entry[]> =>
    ipcRenderer.invoke("entries:getToday"),

  getEntriesForRange: (start: number, end: number): Promise<Entry[]> =>
    ipcRenderer.invoke("entries:getRange", start, end),

  getConfig: (): Promise<Config> =>
    ipcRenderer.invoke("config:get"),

  setConfig: (config: Partial<Config>): Promise<void> =>
    ipcRenderer.invoke("config:set", config),

  closePrompt: (): void =>
    ipcRenderer.send("window:close-prompt"),

  snooze: (minutes: number): void =>
    ipcRenderer.send("window:snooze", minutes),

  onNewPrompt: (callback: (intervalStart: number, intervalEnd: number) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, intervalStart: number, intervalEnd: number) =>
      callback(intervalStart, intervalEnd);
    ipcRenderer.on("prompt:new", listener);
    return () => ipcRenderer.removeListener("prompt:new", listener);
  },

  closeTask: (): void =>
    ipcRenderer.send("window:close-task"),

  startTask: (taskName: string, durationMinutes: number): Promise<TaskState> =>
    ipcRenderer.invoke("task:start", taskName, durationMinutes),

  getTaskState: (): Promise<TaskState | null> => ipcRenderer.invoke("task:getState"),

  onTaskState: (callback: (state: TaskState | null) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: TaskState | null) => callback(state);
    ipcRenderer.on("task:state", listener);
    return () => ipcRenderer.removeListener("task:state", listener);
  },

  onTaskShow: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("task:show", listener);
    return () => ipcRenderer.removeListener("task:show", listener);
  },
});
