import { timerRuntime, type TimerRuntime } from "./timer-runtime";

export class PromptScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private intervalMs: number;
  private lastTickAt: number;
  private running = false;
  private snoozedUntil: number | null = null;

  constructor(intervalMs: number, private onTick: (intervalStart: number, intervalEnd: number) => void,
    private runtime: TimerRuntime = timerRuntime) {
    this.validateInterval(intervalMs);
    this.intervalMs = intervalMs;
    // Initialize lastTickAt to the last completed boundary
    this.lastTickAt = this.lastBoundary();
  }

  /** Unix ms of the most recently completed aligned boundary. */
  lastBoundary(now = this.runtime.now()): number {
    return Math.floor(now / this.intervalMs) * this.intervalMs;
  }

  /** Unix ms of the next upcoming aligned boundary. */
  nextBoundary(now = this.runtime.now()): number {
    return this.lastBoundary(now) + this.intervalMs;
  }

  start(): void {
    this.running = true;
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.runtime.cancel(this.timer);
      this.timer = null;
    }
  }

  updateInterval(ms: number): void {
    this.validateInterval(ms);
    this.intervalMs = ms;
    this.lastTickAt = this.lastBoundary();
    this.snoozedUntil = null;
    if (this.running) this.scheduleNext();
  }

  snooze(ms: number): void {
    this.validateInterval(ms);
    this.snoozedUntil = this.runtime.now() + ms;
    if (this.running) this.scheduleNext();
  }

  getIntervalMs(): number {
    return this.intervalMs;
  }

  getLastTickAt(): number {
    return this.lastTickAt;
  }

  /** Returns ms until the next boundary (for tray menu display). */
  msUntilNext(): number {
    return Math.max(0, (this.snoozedUntil ?? this.nextBoundary()) - this.runtime.now());
  }

  /** Call on system resume to fire a catch-up tick if we missed a boundary. */
  onResume(): void {
    this.check();
  }

  private check(): void {
    if (!this.running) return;
    this.clearTimer();
    const now = this.runtime.now();
    const intervalEnd = this.lastBoundary(now);
    if (this.snoozedUntil !== null && now < this.snoozedUntil) {
      this.scheduleNext();
      return;
    }
    const wasSnoozed = this.snoozedUntil !== null;
    this.snoozedUntil = null;
    // Reset alignment after a backwards clock change instead of suppressing hours of reminders.
    const due = intervalEnd > this.lastTickAt || wasSnoozed;
    if (intervalEnd < this.lastTickAt || due) this.lastTickAt = intervalEnd;
    try {
      if (due) this.onTick(intervalEnd - this.intervalMs, intervalEnd);
    } finally { this.scheduleNext(); }
  }

  private scheduleNext(): void {
    this.clearTimer();
    if (!this.running) return;
    const target = this.snoozedUntil ?? this.nextBoundary();
    // Recheck wall-clock time periodically, including after clock changes or sleep.
    const delay = Math.min(30_000, Math.max(1, target - this.runtime.now()));
    this.timer = this.runtime.schedule(() => this.check(), delay);
  }

  private validateInterval(ms: number): void {
    if (!Number.isSafeInteger(ms) || ms <= 0) throw new Error("Reminder interval must be a positive duration.");
  }
}
