/** @jsxImportSource preact */
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { api } from "../shared/ipc-api";
import type { TaskState } from "../../shared/types";

function TaskWindow() {
  const [taskName, setTaskName] = useState("");
  const [duration, setDuration] = useState(25);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function applyState(state: TaskState | null) {
    if (!state) {
      setTaskName("");
      setDuration(25);
      setRunning(false);
      setCompleted(false);
      setRemainingSeconds(0);
      setError("");
      inputRef.current?.focus();
      return;
    }
    setTaskName(state.name);
    setDuration(state.durationMinutes);
    setRunning(state.status === "running");
    setCompleted(state.status === "completed");
    setRemainingSeconds(Math.max(0, Math.min(state.durationMinutes * 60, Math.ceil((state.endTime - Date.now()) / 1000))));
  }

  useEffect(() => {
    const refresh = () => { api.getTaskState().then(applyState).catch(() => setError("Could not load the timer. Please reopen this window.")); };
    const cleanupState = api.onTaskState(applyState);
    const cleanupShow = api.onTaskShow(refresh);
    refresh();
    inputRef.current?.focus();
    return () => { cleanupState(); cleanupShow(); };
  }, []);

  async function handleStart() {
    if (!taskName.trim() || duration < 1 || duration > 999 || starting || running || completed) return;
    setStarting(true);
    setError("");
    try { applyState(await api.startTask(taskName.trim(), duration)); }
    catch { setError("Could not start the timer. Please try again."); }
    finally { setStarting(false); }
  }

  function handleCancel() {
    api.closeTask();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleStart();
    if (e.key === "Escape") handleCancel();
  }

  const elapsedSeconds = Math.max(0, duration * 60 - remainingSeconds);
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const progress = `${mins}:${String(secs).padStart(2, "0")}/${duration}`;

  if (completed) {
    return (
      <div class="flex flex-col items-center justify-center flex-1 gap-4">
        <span class="text-[15px] font-semibold text-accent">Task completed!</span>
        <span class="text-[13px] text-text-muted text-center leading-relaxed">{taskName}</span>
        <span class="text-xs text-text-faint">{duration} min</span>
        <button
          class="no-drag mt-2 w-full bg-accent text-white rounded-[7px] text-[13px] font-medium py-1.5 cursor-pointer active:opacity-70 transition-opacity"
          onClick={handleCancel}
        >
          Done
        </button>
      </div>
    );
  }

  if (running) {
    return (
      <div class="flex flex-col items-center justify-center flex-1 gap-3">
        <span class="text-[13px] text-text-muted text-center leading-relaxed">{taskName}</span>
        <span class="text-[32px] font-bold tabular-nums tracking-wide text-text-primary"
          aria-label={`${mins} minutes ${secs} seconds elapsed of ${duration} minutes`}>{progress}</span>
        <button
          class="no-drag mt-2 w-full bg-surface-raised text-text-muted border border-border rounded-[7px] text-[13px] font-medium py-1.5 cursor-pointer active:opacity-70 transition-opacity"
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <>
      <span class="text-[13px] font-semibold tracking-wide mb-2.5">Start a Task</span>

      <input
        ref={inputRef}
        class="no-drag bg-surface-raised border border-border rounded-lg text-text-primary text-sm px-3 py-2.5 outline-none leading-relaxed focus:border-accent transition-colors placeholder:text-text-ghost"
        placeholder="What are you going to do?"
        value={taskName}
        onInput={(e) => setTaskName((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
      />

      <div class="no-drag flex items-center gap-2 mt-3">
        <span class="text-[11px] text-text-faint font-medium">Duration</span>
        <input
          type="number"
          min="1"
          max="999"
          class="w-16 bg-surface-raised border border-border rounded-md text-text-primary text-sm px-2 py-1 outline-none text-center tabular-nums focus:border-accent transition-colors"
          value={duration}
          onInput={(e) => {
            const v = parseInt((e.target as HTMLInputElement).value);
            if (!isNaN(v) && v > 0) setDuration(v);
          }}
          onKeyDown={handleKeyDown}
        />
        <span class="text-[11px] text-text-faint font-medium">min</span>
      </div>

      <div class="no-drag flex gap-2 mt-auto pt-3">
        <button
          class="flex-1 bg-surface-raised text-text-muted border border-border rounded-[7px] text-[13px] font-medium py-1.5 cursor-pointer active:opacity-70 transition-opacity"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          class="flex-1 bg-accent text-white rounded-[7px] text-[13px] font-medium py-1.5 cursor-pointer active:opacity-70 transition-opacity disabled:bg-accent-muted disabled:text-text-ghost disabled:cursor-not-allowed"
          onClick={handleStart}
          disabled={!taskName.trim() || starting || duration < 1 || duration > 999}
        >
          {starting ? "Starting…" : "Start (⌘↵)"}
        </button>
      </div>
      {error && <p role="alert" class="text-xs text-red-400 mt-2">{error}</p>}
    </>
  );
}

render(<TaskWindow />, document.getElementById("app")!);
