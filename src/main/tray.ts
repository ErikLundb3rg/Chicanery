import { Tray, Menu, nativeImage, app } from "electron";
import path from "path";
import type { PromptScheduler } from "./scheduler";
import { showPromptWindow, showTimelineWindow } from "./windows";
import { getConfigValue, setConfigValue } from "./db/queries";
import type { Database } from "better-sqlite3";

let tray: Tray | null = null;

const INTERVAL_OPTIONS = [
  { label: "5 minutes", ms: 5 * 60 * 1000 },
  { label: "10 minutes", ms: 10 * 60 * 1000 },
  { label: "15 minutes", ms: 15 * 60 * 1000 },
  { label: "30 minutes", ms: 30 * 60 * 1000 },
  { label: "60 minutes", ms: 60 * 60 * 1000 },
];

export function createTray(db: Database, scheduler: PromptScheduler): Tray {
  const iconPath = path.join(app.getAppPath(), "resources", "tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip("Chicanery");
  rebuildMenu(db, scheduler);

  return tray;
}

export function rebuildMenu(db: Database, scheduler: PromptScheduler): void {
  if (!tray) return;

  const currentMs = scheduler.getIntervalMs();
  const nextTickIn = Math.ceil(scheduler.msUntilNext() / 60000);
  const nextLabel = nextTickIn > 0 ? `Next prompt in ~${nextTickIn}m` : "Prompting soon…";

  const intervalItems = INTERVAL_OPTIONS.map((opt) => ({
    label: opt.label,
    type: "radio" as const,
    checked: currentMs === opt.ms,
    click: () => {
      setConfigValue(db, "intervalMs", String(opt.ms));
      scheduler.updateInterval(opt.ms);
      rebuildMenu(db, scheduler);
    },
  }));

  const launchAtLogin = app.getLoginItemSettings().openAtLogin;

  const menu = Menu.buildFromTemplate([
    { label: nextLabel, enabled: false },
    { type: "separator" },
    {
      label: "Log now",
      accelerator: "CmdOrCtrl+Shift+L",
      click: () => {
        const end = scheduler.lastBoundary();
        showPromptWindow(end - scheduler.getIntervalMs(), end);
      },
    },
    {
      label: "View today",
      click: () => showTimelineWindow(),
    },
    { type: "separator" },
    {
      label: "Interval",
      submenu: intervalItems,
    },
    {
      label: "Launch at login",
      type: "checkbox",
      checked: launchAtLogin,
      click: () => {
        const next = !launchAtLogin;
        app.setLoginItemSettings({ openAtLogin: next });
        setConfigValue(db, "launchAtLogin", String(next));
      },
    },
    { type: "separator" },
    { label: "Quit", role: "quit" },
  ]);

  tray.setContextMenu(menu);
}
