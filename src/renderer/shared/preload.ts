import { contextBridge, ipcRenderer } from "electron";
import type { Entry, Config } from "../../shared/types";

contextBridge.exposeInMainWorld("electronAPI", {
  submitEntry: (content: string, intervalStart: number, intervalEnd: number): Promise<Entry> =>
    ipcRenderer.invoke("entries:add", content, intervalStart, intervalEnd),

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
    ipcRenderer.on("prompt:new", (_event, intervalStart: number, intervalEnd: number) => callback(intervalStart, intervalEnd));
    return () => ipcRenderer.removeAllListeners("prompt:new");
  },
});
