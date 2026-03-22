import { BrowserWindow, screen, app } from "electron";
import path from "path";

const windows: {
  prompt?: BrowserWindow;
  timeline?: BrowserWindow;
} = {};

function preloadPath(): string {
  return path.join(app.getAppPath(), "dist/renderer/shared/preload.js");
}

function rendererPath(...parts: string[]): string {
  return path.join(app.getAppPath(), "dist/renderer", ...parts);
}

export function getPromptWindow(): BrowserWindow {
  if (!windows.prompt || windows.prompt.isDestroyed()) {
    windows.prompt = new BrowserWindow({
      width: 420,
      height: 240,
      show: false,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: preloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    windows.prompt.loadFile(rendererPath("prompt/index.html"));
  }
  return windows.prompt;
}

export function showPromptWindow(intervalStart: number, intervalEnd: number): void {
  const win = getPromptWindow();

  // Center on the primary display
  const { bounds } = screen.getPrimaryDisplay();
  const x = Math.round(bounds.x + bounds.width / 2 - 210);
  const y = Math.round(bounds.y + bounds.height / 2 - 120);
  win.setPosition(x, y);

  const send = () => win.webContents.send("prompt:new", intervalStart, intervalEnd);

  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", send);
  } else {
    send();
  }

  win.show();
  win.focus();
}

export function hidePromptWindow(): void {
  windows.prompt?.hide();
}

export function getTimelineWindow(): BrowserWindow {
  if (!windows.timeline || windows.timeline.isDestroyed()) {
    windows.timeline = new BrowserWindow({
      width: 520,
      height: 600,
      show: false,
      titleBarStyle: "hiddenInset",
      webPreferences: {
        preload: preloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    windows.timeline.loadFile(rendererPath("timeline/index.html"));
    windows.timeline.on("close", (e) => {
      e.preventDefault();
      windows.timeline?.hide();
    });
  }
  return windows.timeline;
}

export function showTimelineWindow(): void {
  const win = getTimelineWindow();
  win.show();
  win.focus();
  // Reload entries when window is shown
  win.webContents.send("timeline:refresh");
}
