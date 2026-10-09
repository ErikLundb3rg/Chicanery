import type { TaskState } from "../shared/types";
import { timerRuntime, type TimerRuntime } from "./timer-runtime";

// Completion belongs to the main process, independent of hidden renderer timers.
export class TaskTimer {
  private state: TaskState | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private onChange: (state: TaskState | null) => void,
    private runtime: TimerRuntime = timerRuntime) {}

  getState(): TaskState | null { return this.state ? { ...this.state } : null; }

  start(name: string, durationMinutes: number): TaskState {
    if (typeof name !== "string" || !name.trim() || !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 || durationMinutes > 999) throw new Error("Enter a task and a duration from 1 to 999 minutes.");
    this.clearTimer();
    this.state = { name: name.trim(), durationMinutes,
      endTime: this.runtime.now() + durationMinutes * 60_000, status: "running" };
    this.check();
    return this.getState()!;
  }

  stop(): void {
    this.clearTimer();
    this.state = null;
    this.onChange(null);
  }

  check(): void {
    this.clearTimer();
    if (!this.state || this.state.status !== "running") return;
    const remaining = this.state.endTime - this.runtime.now();
    if (remaining <= 0) this.state = { ...this.state, status: "completed" };
    else this.timer = this.runtime.schedule(() => this.check(), Math.min(1000, remaining));
    this.onChange(this.getState());
  }

  private clearTimer(): void {
    if (this.timer !== null) this.runtime.cancel(this.timer);
    this.timer = null;
  }
}
