import type { Entry } from "../../shared/types";

export interface TimelineBlock {
  entry: Entry;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

export function dayBounds(date: Date): { start: number; end: number } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

export function layoutEntries(entries: Entry[], start: number, end: number): TimelineBlock[] {
  const blocks = entries
    .map((entry) => ({ entry, start: Math.max(start, entry.interval_start),
      end: Math.min(end, entry.interval_end), lane: 0, lanes: 1 }))
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start || b.end - a.end || a.entry.id - b.entry.id);
  let group: TimelineBlock[] = [];
  let laneEnds: number[] = [];
  let groupEnd = start;
  const finishGroup = () => group.forEach((block) => { block.lanes = laneEnds.length; });
  for (const block of blocks) {
    if (block.start >= groupEnd) {
      finishGroup();
      group = [];
      laneEnds = [];
    }
    let lane = laneEnds.findIndex((end) => end <= block.start);
    if (lane === -1) lane = laneEnds.length;
    block.lane = lane;
    laneEnds[lane] = block.end;
    group.push(block);
    groupEnd = Math.max(groupEnd, block.end);
  }
  finishGroup();
  return blocks;
}

// Use the union of logged intervals so overlapping logs cannot hide or invent gaps.
export function timelineGaps(blocks: TimelineBlock[], start: number, end: number) {
  const gaps: { start: number; end: number }[] = [];
  let cursor = start;
  for (const block of blocks) {
    if (block.start >= end) break;
    if (block.start > cursor) gaps.push({ start: cursor, end: Math.min(end, block.start) });
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < end) gaps.push({ start: cursor, end });
  return gaps;
}
