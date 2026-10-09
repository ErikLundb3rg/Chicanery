import { describe, expect, test } from "bun:test";
import { TaskTimer } from "../src/main/task-timer";
import { PromptScheduler } from "../src/main/scheduler";
import type { TaskState } from "../src/shared/types";
import { FakeClock } from "./fake-clock";

const minute = 60_000;

describe("main-process task timer", () => {
  test("completes once without any renderer completion message", () => {
    const clock = new FakeClock();
    const states: (TaskState | null)[] = [];
    const timer = new TaskTimer((state) => states.push(state), clock.runtime);
    timer.start("Test", 1);
    clock.advance(14_000);
    expect(timer.getState()?.status).toBe("running");
    clock.advance(46_000);
    expect(timer.getState()?.status).toBe("completed");
    timer.check();
    clock.advance(minute);
    expect(states.filter((state) => state?.status === "completed")).toHaveLength(1);
    expect(clock.jobs.size).toBe(0);
  });

  test("wake catches an expired deadline and cancels the pending tick", () => {
    const clock = new FakeClock();
    const states: (TaskState | null)[] = [];
    const timer = new TaskTimer((state) => states.push(state), clock.runtime);
    timer.start("Sleep test", 25);
    clock.time = 40 * minute;
    timer.check();
    timer.check();
    expect(timer.getState()?.status).toBe("completed");
    expect(states.filter((state) => state?.status === "completed")).toHaveLength(1);
    expect(clock.jobs.size).toBe(0);
  });

  test("cancellation and replacement cannot complete the old task", () => {
    const clock = new FakeClock();
    const states: (TaskState | null)[] = [];
    const timer = new TaskTimer((state) => states.push(state), clock.runtime);
    timer.start("Old", 1);
    clock.advance(30_000);
    timer.start("New", 2);
    clock.advance(30_000);
    expect(timer.getState()?.name).toBe("New");
    expect(timer.getState()?.status).toBe("running");
    timer.stop();
    clock.advance(5 * minute);
    expect(timer.getState()).toBeNull();
    expect(states.filter((state) => state?.status === "completed")).toHaveLength(0);
  });

  test("invalid starts leave the existing task intact", () => {
    const clock = new FakeClock();
    const timer = new TaskTimer(() => {}, clock.runtime);
    const original = timer.start("Valid", 1);
    for (const duration of [NaN, Infinity, 0, -1, 0.5, 1000]) {
      expect(() => timer.start("Invalid", duration)).toThrow();
    }
    expect(() => timer.start(" ", 1)).toThrow();
    expect(timer.getState()).toEqual(original);
  });
});

describe("regular reminder recovery", () => {
  test("delayed callback shows the latest interval once, then continues", () => {
    const clock = new FakeClock();
    const ticks: number[][] = [];
    const scheduler = new PromptScheduler(15 * minute, (start, end) => ticks.push([start, end]), clock.runtime);
    scheduler.start();
    clock.advance(47 * minute);
    expect(ticks).toEqual([[30 * minute, 45 * minute]]);
    scheduler.onResume();
    expect(ticks).toHaveLength(1);
    expect(clock.jobs.size).toBe(1);
    clock.advance(13 * minute);
    expect(ticks[1]).toEqual([45 * minute, 60 * minute]);
  });

  test("resume before a pending callback does not produce duplicate reminders", () => {
    const clock = new FakeClock();
    let ticks = 0;
    const scheduler = new PromptScheduler(15 * minute, () => ticks++, clock.runtime);
    scheduler.start();
    scheduler.start();
    expect(clock.jobs.size).toBe(1);
    clock.time = 16 * minute;
    scheduler.onResume();
    scheduler.onResume();
    clock.advance(1000);
    expect(ticks).toBe(1);
    expect(clock.jobs.size).toBe(1);
    scheduler.stop();
    scheduler.onResume();
    clock.advance(30 * minute);
    expect(ticks).toBe(1);
    expect(clock.jobs.size).toBe(0);
  });

  test("snooze is relative to now and does not change the configured interval", () => {
    const clock = new FakeClock();
    clock.time = 16 * minute;
    let ticks = 0;
    const scheduler = new PromptScheduler(15 * minute, () => ticks++, clock.runtime);
    scheduler.start();
    scheduler.snooze(5 * minute);
    expect(scheduler.msUntilNext()).toBe(5 * minute);
    clock.advance(4 * minute);
    scheduler.onResume();
    expect(ticks).toBe(0);
    clock.advance(minute);
    expect(ticks).toBe(1);
    expect(scheduler.getIntervalMs()).toBe(15 * minute);
    expect(scheduler.msUntilNext()).toBe(9 * minute);
    clock.advance(9 * minute);
    expect(ticks).toBe(2);
  });

  test("backwards clock changes realign the next reminder", () => {
    const clock = new FakeClock();
    clock.time = 60 * minute;
    const ticks: number[] = [];
    const scheduler = new PromptScheduler(15 * minute, (_start, end) => ticks.push(end), clock.runtime);
    scheduler.start();
    clock.time = 20 * minute;
    scheduler.onResume();
    clock.advance(10 * minute);
    expect(ticks).toEqual([30 * minute]);
  });
});
