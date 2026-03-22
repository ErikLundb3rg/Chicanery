import { ipcMain } from "electron";
import type { Database } from "better-sqlite3";
import { addEntry, getEntriesForDay, getEntriesForRange, getConfigValue, setConfigValue } from "./db/queries";
import type { Config } from "../shared/types";
import { DEFAULT_CONFIG } from "../shared/types";
import { CONFIG_KEYS } from "../shared/config-keys";
import type { PromptScheduler } from "./scheduler";

export function registerIpcHandlers(db: Database, scheduler: PromptScheduler): void {
  ipcMain.handle("entries:add", (_event, content: string, intervalStart: number, intervalEnd: number) => {
    return addEntry(db, content, intervalStart, intervalEnd);
  });

  ipcMain.handle("entries:getToday", () => {
    return getEntriesForDay(db, new Date());
  });

  ipcMain.handle("entries:getRange", (_event, start: number, end: number) => {
    return getEntriesForRange(db, new Date(start), new Date(end));
  });

  ipcMain.handle("config:get", (): Config => {
    const intervalMs = getConfigValue(db, CONFIG_KEYS.intervalMs);
    const launchAtLogin = getConfigValue(db, CONFIG_KEYS.launchAtLogin);
    return {
      intervalMs: intervalMs ? parseInt(intervalMs) : DEFAULT_CONFIG.intervalMs,
      launchAtLogin: launchAtLogin === "true",
    };
  });

  ipcMain.handle("config:set", (_event, partial: Partial<Config>) => {
    if (partial.intervalMs !== undefined) {
      setConfigValue(db, CONFIG_KEYS.intervalMs, String(partial.intervalMs));
      scheduler.updateInterval(partial.intervalMs);
    }
    if (partial.launchAtLogin !== undefined) {
      setConfigValue(db, CONFIG_KEYS.launchAtLogin, String(partial.launchAtLogin));
    }
  });
}
