import { describe, expect, test } from "bun:test";
import { dayBounds, layoutEntries, timelineGaps } from "../src/renderer/timeline/layout";
import type { Entry } from "../src/shared/types";

const minute = 60_000;
const entry = (id: number, start: number, end: number): Entry => ({
  id, content: `Task ${id}`, category: null, interval_start: start * minute,
  interval_end: end * minute, created_at: 0,
});

describe("day timeline", () => {
  test("clips logs at day boundaries and keeps actual durations", () => {
    const blocks = layoutEntries([entry(1, -10, 20), entry(2, 50, 110), entry(3, 110, 120)], 0, 100 * minute);
    expect(blocks.map(({ start, end }) => [start / minute, end / minute])).toEqual([[0, 20], [50, 100]]);
    expect(timelineGaps(blocks, 0, 100 * minute)).toEqual([{ start: 20 * minute, end: 50 * minute }]);
  });

  test("overlapping and nested logs use lanes without creating gaps", () => {
    const blocks = layoutEntries([entry(3, 20, 40), entry(1, 0, 60), entry(4, 80, 90), entry(2, 10, 20)], 0, 100 * minute);
    expect(blocks.map(({ lane, lanes }) => [lane, lanes])).toEqual([[0, 2], [1, 2], [1, 2], [0, 1]]);
    expect(timelineGaps(blocks, 0, 100 * minute)).toEqual([
      { start: 60 * minute, end: 80 * minute }, { start: 90 * minute, end: 100 * minute },
    ]);
  });

  test("includes leading and trailing unlogged time but excludes future time", () => {
    const blocks = layoutEntries([entry(1, 20, 30), entry(2, 90, 100)], 0, 100 * minute);
    expect(timelineGaps(blocks, 0, 50 * minute)).toEqual([
      { start: 0, end: 20 * minute }, { start: 30 * minute, end: 50 * minute },
    ]);
    expect(timelineGaps([], 0, 50 * minute)).toEqual([{ start: 0, end: 50 * minute }]);
  });

  test("bounds are local midnight to the next midnight", () => {
    const date = new Date(2026, 9, 5, 14, 20);
    const { start, end } = dayBounds(date);
    expect(start).toBe(new Date(2026, 9, 5).getTime());
    expect(end).toBe(new Date(2026, 9, 6).getTime());
  });
});
