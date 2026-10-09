import type { TimerRuntime } from "../src/main/timer-runtime";

export class FakeClock {
  time = 0;
  private nextId = 0;
  jobs = new Map<number, { at: number; callback: () => void }>();
  runtime: TimerRuntime = {
    now: () => this.time,
    schedule: (callback, delay) => {
      const id = ++this.nextId;
      this.jobs.set(id, { at: this.time + delay, callback });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    cancel: (id) => { this.jobs.delete(id as unknown as number); },
  };

  // Jump wall-clock time before delivering callbacks, just like a sleeping or busy process.
  advance(ms: number): void {
    this.time += ms;
    for (const [id, job] of [...this.jobs]) {
      if (job.at <= this.time && this.jobs.delete(id)) job.callback();
    }
  }
}
