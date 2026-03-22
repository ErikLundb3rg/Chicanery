export class PromptScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private intervalMs: number;
  private lastTickAt: number;

  constructor(intervalMs: number, private onTick: (intervalStart: number, intervalEnd: number) => void) {
    this.intervalMs = intervalMs;
    // Initialize lastTickAt to the last completed boundary
    this.lastTickAt = this.lastBoundary();
  }

  /** Unix ms of the most recently completed aligned boundary. */
  lastBoundary(now = Date.now()): number {
    return Math.floor(now / this.intervalMs) * this.intervalMs;
  }

  /** Unix ms of the next upcoming aligned boundary. */
  nextBoundary(now = Date.now()): number {
    return this.lastBoundary(now) + this.intervalMs;
  }

  start(): void {
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  updateInterval(ms: number): void {
    this.intervalMs = ms;
    this.lastTickAt = this.lastBoundary();
    this.stop();
    this.scheduleNext();
  }

  getIntervalMs(): number {
    return this.intervalMs;
  }

  getLastTickAt(): number {
    return this.lastTickAt;
  }

  /** Returns ms until the next boundary (for tray menu display). */
  msUntilNext(): number {
    return this.nextBoundary() - Date.now();
  }

  /** Call on system resume to fire a catch-up tick if we missed a boundary. */
  onResume(): void {
    const last = this.lastBoundary();
    if (last > this.lastTickAt) {
      this.stop();
      this.tick();
    }
  }

  private tick(): void {
    const now = Date.now();
    const intervalEnd = this.lastBoundary(now);
    const intervalStart = intervalEnd - this.intervalMs;
    this.lastTickAt = intervalEnd;
    this.onTick(intervalStart, intervalEnd);
    this.scheduleNext();
  }

  private scheduleNext(): void {
    const delay = this.nextBoundary() - Date.now();
    this.timer = setTimeout(() => this.tick(), delay);
  }
}
