import { app, ipcMain, powerMonitor } from "electron";
import { getDb, closeDb } from "./db/database";
import { getConfigValue } from "./db/queries";
import { PromptScheduler } from "./scheduler";
import { createTray, rebuildMenu, updateTaskTimerDisplay } from "./tray";
import { TaskTimer } from "./task-timer";
import { registerIpcHandlers } from "./ipc";
import { showPromptWindow, hidePromptWindow, getPromptWindow, getTimelineWindow, getTaskWindow, hideTaskWindow, updateTaskWindow, destroyAllWindows } from "./windows";
import { DEFAULT_CONFIG } from "../shared/types";
import { CONFIG_KEYS } from "../shared/config-keys";

// Menu bar apps must not appear in the Dock or Cmd+Tab switcher
app.dock?.hide();

// Prevent the app from quitting when all windows are closed
app.on("window-all-closed", () => {
  // intentionally empty — keep running in the menu bar
});

app.whenReady().then(() => {
  const db = getDb();

  // Load saved interval or fall back to default
  const savedInterval = getConfigValue(db, CONFIG_KEYS.intervalMs);
  const parsedInterval = savedInterval ? Number(savedInterval) : DEFAULT_CONFIG.intervalMs;
  const intervalMs = Number.isSafeInteger(parsedInterval) && parsedInterval > 0 ? parsedInterval : DEFAULT_CONFIG.intervalMs;

  const scheduler = new PromptScheduler(intervalMs, (intervalStart, intervalEnd) => {
    showPromptWindow(intervalStart, intervalEnd);
  });
  const taskTimer = new TaskTimer((state) => {
    updateTaskTimerDisplay(state);
    updateTaskWindow(state);
  });

  // IPC: close prompt window
  ipcMain.on("window:close-prompt", () => {
    hidePromptWindow();
  });

  // IPC: snooze prompt
  ipcMain.on("window:snooze", (_event, minutes: number) => {
    scheduler.snooze(minutes * 60_000);
    hidePromptWindow();
  });

  // IPC: timeline refresh signal
  ipcMain.on("timeline:shown", () => {
    // handled in renderer via onNewPrompt listener
  });

  // IPC: close task window (cancel)
  ipcMain.on("window:close-task", () => {
    hideTaskWindow();
    taskTimer.stop();
  });

  // IPC: task started — hide window and show elapsed/total time in menu bar
  ipcMain.handle("task:start", (_event, taskName: string, durationMinutes: number) => {
    const state = taskTimer.start(taskName, durationMinutes);
    hideTaskWindow();
    return state;
  });

  ipcMain.handle("task:getState", () => {
    taskTimer.check();
    return taskTimer.getState();
  });

  registerIpcHandlers(db, scheduler);

  createTray(db, scheduler);

  // Pre-warm windows so they appear instantly
  getPromptWindow();
  getTimelineWindow();
  getTaskWindow();

  scheduler.start();
  // Show prompt for the last completed interval on launch
  const lastBoundary = scheduler.lastBoundary();
  showPromptWindow(lastBoundary - intervalMs, lastBoundary);

  const menuRefreshInterval = setInterval(() => rebuildMenu(db, scheduler), 60_000);

  const recoverTimers = () => {
    scheduler.onResume();
    taskTimer.check();
  };
  powerMonitor.on("resume", recoverTimers);
  powerMonitor.on("unlock-screen", recoverTimers);

  app.on("before-quit", () => {
    taskTimer.stop();
    destroyAllWindows();
    clearInterval(menuRefreshInterval);
    scheduler.stop();
    closeDb();
  });
});
