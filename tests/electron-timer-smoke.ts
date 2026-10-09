import { app, ipcMain } from "electron";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { TaskTimer } from "../src/main/task-timer";
import { getTaskWindow, showTaskWindow, hideTaskWindow, updateTaskWindow } from "../src/main/windows";

// An isolated Electron app exercises the real preload and renderer without touching user logs.
const profile = path.join(app.getAppPath(), "profile");
mkdirSync(profile);
app.setPath("userData", profile);
app.dock?.hide();
const timeout = setTimeout(() => { console.error("Electron timer test timed out"); app.exit(1); }, 20_000);

app.whenReady().then(async () => {
  let now = Date.now();
  let completions = 0;
  const timer = new TaskTimer((state) => {
    if (state?.status === "completed") completions++;
    updateTaskWindow(state);
  }, { now: () => now, schedule: (callback, ms) => setTimeout(callback, ms), cancel: clearTimeout });
  ipcMain.handle("task:getState", () => timer.getState());
  ipcMain.handle("task:start", (_event, name, duration) => {
    const state = timer.start(name, duration);
    hideTaskWindow();
    return state;
  });
  ipcMain.on("window:close-task", () => { timer.stop(); hideTaskWindow(); });
  const win = getTaskWindow();
  const waitFor = async (condition: () => boolean | Promise<boolean>) => {
    for (let i = 0; i < 100; i++) {
      if (await condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("Expected timer state did not arrive");
  };
  await waitFor(async () => !win.webContents.isLoading() && await win.webContents.executeJavaScript("Boolean(document.querySelector('input'))"));
  await win.webContents.executeJavaScript(`
    const name = document.querySelector('input');
    name.value = 'Hidden-window test'; name.dispatchEvent(new Event('input', { bubbles: true }));
    const duration = document.querySelector('input[type=number]');
    duration.value = '1'; duration.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  await waitFor(async () => await win.webContents.executeJavaScript("!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start')).disabled"));
  await win.webContents.executeJavaScript("Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start')).click()");
  await waitFor(() => timer.getState()?.status === "running" && !win.isVisible());
  showTaskWindow();
  await waitFor(async () => await win.webContents.executeJavaScript("document.body.textContent.includes('Hidden-window test') && document.body.textContent.includes('/1')"));
  assert.equal(timer.getState()?.name, "Hidden-window test", "Reopening must preserve the active timer");
  hideTaskWindow();
  now += 65_000;
  timer.check();
  await waitFor(async () => win.isVisible() && await win.webContents.executeJavaScript("document.body.textContent.includes('Task completed!')"));
  timer.check();
  assert.equal(completions, 1, "Completion must happen once");
  await win.webContents.executeJavaScript("document.querySelector('button').click()");
  await waitFor(() => timer.getState() === null && !win.isVisible());
  timer.start("Cancelled task", 1);
  timer.stop();
  now += 65_000;
  timer.check();
  assert.equal(completions, 1, "A cancelled task must not alert");
  clearTimeout(timeout);
  console.log("PASS: hidden task completes, reopening preserves timer, cancellation prevents alerts");
  win.destroy();
  app.exit(0);
}).catch((error) => { console.error(error); app.exit(1); });
