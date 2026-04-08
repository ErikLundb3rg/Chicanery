import { contextBridge, ipcRenderer } from "electron";
import type { Entry, Config } from "../../shared/types";

contextBridge.exposeInMainWorld("electronAPI", {
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

  startTask: (taskName: string, durationMinutes: number): void =>
    ipcRenderer.send("task:start", taskName, durationMinutes),

  taskCompleted: (taskName: string, durationMinutes: number): void =>
    ipcRenderer.send("task:completed", taskName, durationMinutes),

  onTaskShow: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("task:show", listener);
    return () => ipcRenderer.removeListener("task:show", listener);
  },
});
