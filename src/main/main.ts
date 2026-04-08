import { app, ipcMain, powerMonitor, screen } from "electron";
import { getDb, closeDb } from "./db/database";
import { getConfigValue } from "./db/queries";
import { PromptScheduler } from "./scheduler";
import { createTray, rebuildMenu, startTaskTimer, stopTaskTimer } from "./tray";
import { registerIpcHandlers } from "./ipc";
import { showPromptWindow, hidePromptWindow, getPromptWindow, getTimelineWindow, getTaskWindow, showTaskWindow, hideTaskWindow, destroyAllWindows } from "./windows";
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
  const intervalMs = savedInterval ? parseInt(savedInterval) : DEFAULT_CONFIG.intervalMs;

  const scheduler = new PromptScheduler(intervalMs, (intervalStart, intervalEnd) => {
    showPromptWindow(intervalStart, intervalEnd);
  });

  // IPC: close prompt window
  ipcMain.on("window:close-prompt", () => {
    hidePromptWindow();
  });

  // IPC: snooze prompt
  ipcMain.on("window:snooze", (_event, minutes: number) => {
    const originalMs = scheduler.getIntervalMs();
    hidePromptWindow();
    scheduler.updateInterval(minutes * 60 * 1000);
    setTimeout(() => scheduler.updateInterval(originalMs), minutes * 60 * 1000);
  });

  // IPC: timeline refresh signal
  ipcMain.on("timeline:shown", () => {
    // handled in renderer via onNewPrompt listener
  });

  // IPC: close task window (cancel)
  ipcMain.on("window:close-task", () => {
    hideTaskWindow();
    stopTaskTimer();
  });

  // IPC: task started — hide window and show countdown in menu bar
  ipcMain.on("task:start", (_event, taskName: string, durationMinutes: number) => {
    hideTaskWindow();
    startTaskTimer(taskName, durationMinutes);
  });

  // IPC: task completed — show the window and clear menu bar countdown
  ipcMain.on("task:completed", (_event, _taskName: string, _durationMinutes: number) => {
    stopTaskTimer();
    const win = getTaskWindow();
    const { bounds } = screen.getPrimaryDisplay();
    const x = Math.round(bounds.x + bounds.width / 2 - 190);
    const y = Math.round(bounds.y + bounds.height / 2 - 140);
    win.setPosition(x, y);
    win.show();
    win.focus();
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

  powerMonitor.on("resume", () => scheduler.onResume());

  app.on("before-quit", () => {
    destroyAllWindows();
    clearInterval(menuRefreshInterval);
    scheduler.stop();
    closeDb();
  });
});
