/** @jsxImportSource preact */
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { api } from "../shared/ipc-api";
import { formatTime, formatDate, formatDuration } from "../shared/formatters";
import type { Entry, Category } from "../../shared/types";
import { dayBounds, layoutEntries, timelineGaps } from "./layout";
import { EditEntry } from "./edit-entry";

const CATEGORY_META: Record<Category | "none", { label: string; color: string }> = {
  focus_3:     { label: "Productivity 3", color: "#0a84ff" },
  focus_2:     { label: "Productivity 2", color: "#5ac8fa" },
  focus_1:     { label: "Productivity 1", color: "#6e6e73" },
  maintenance: { label: "Maintenance",  color: "#8e8e93" },
  none:        { label: "Uncategorized", color: "#3a3a3c" },
};

const CATEGORY_ORDER: (Category | "none")[] = [
  "focus_3", "focus_2", "focus_1", "maintenance", "none",
];

function entryLabel(category: Category | null): string {
  return CATEGORY_META[category ?? "none"].label;
}

interface Segment {
  key: Category | "none";
  label: string;
  color: string;
  ms: number;
  fraction: number;
}

function computeSegments(entries: Entry[], start: number, end: number): Segment[] {
  const durations: Partial<Record<Category | "none", number>> = {};
  for (const entry of entries) {
    const key = (entry.category ?? "none") as Category | "none";
    durations[key] = (durations[key] ?? 0) + Math.max(0, Math.min(end, entry.interval_end) - Math.max(start, entry.interval_start));
  }
  const total = Object.values(durations).reduce((sum, d) => sum + (d ?? 0), 0);
  return CATEGORY_ORDER
    .filter((key) => (durations[key] ?? 0) > 0)
    .map((key) => ({
      key,
      ...CATEGORY_META[key],
      ms: durations[key]!,
      fraction: durations[key]! / total,
    }));
}

function DonutChart({ segments }: { segments: Segment[] }) {
  const cx = 50, cy = 50, R = 36, sw = 16;

  function pt(angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + R * Math.cos(rad), cy + R * Math.sin(rad)] as const;
  }

  function arc(start: number, end: number): string {
    const [sx, sy] = pt(start);
    const [ex, ey] = pt(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`;
  }

  let angle = 0;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#2c2c2e" stroke-width={sw} />
      {segments.map((seg) => {
        const start = angle;
        const sweep = seg.fraction * 359.9999;
        angle += seg.fraction * 360;
        return (
          <path
            key={seg.key}
            d={arc(start, start + sweep)}
            fill="none"
            stroke={seg.color}
            stroke-width={sw}
            stroke-linecap="butt"
          />
        );
      })}
    </svg>
  );
}

function TimelineWindow() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [now, setNow] = useState(Date.now());
  const [zoom, setZoom] = useState("compact");
  const [viewportHeight, setViewportHeight] = useState(400);
  const scroller = useRef<HTMLDivElement>(null);
  const previousScale = useRef(1 / 60_000);
  const scrolledDay = useRef<number | null>(null);
  const request = useRef(0);

  async function load() {
    const currentRequest = ++request.current;
    try {
      const data = await api.getEntriesForToday();
      if (currentRequest !== request.current) return;
      setEntries(data);
      setNow(Date.now());
      setError("");
      setLoading(false);
    } catch {
      if (currentRequest !== request.current) return;
      setError("Could not load task logs.");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    window.addEventListener("focus", load);
    const timer = setInterval(load, 60_000);
    return () => { window.removeEventListener("focus", load); clearInterval(timer); };
  }, []);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setViewportHeight(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { start, end } = dayBounds(new Date(now));
  const blocks = layoutEntries(entries, start, end);
  const gaps = timelineGaps(blocks, start, Math.min(now, end));
  const gapMs = gaps.reduce((sum, gap) => sum + gap.end - gap.start, 0);
  const totalMs = blocks.reduce((sum, block) => sum + block.end - block.start, 0);
  const today = formatDate(new Date(now));
  const segments = computeSegments(entries, start, end);
  const pixelsPerMs = zoom === "day" ? Math.max(1, viewportHeight - 52) / (end - start)
    : (zoom === "detail" ? 3 : 1) / 60_000;
  const y = (time: number) => (time - start) * pixelsPerMs;
  const ticks: number[] = [];
  for (let tick = start; tick < end; tick += 30 * 60_000) ticks.push(tick);

  useEffect(() => {
    const element = scroller.current;
    if (element) {
      element.scrollTop = zoom === "day" ? 0 : element.scrollTop * pixelsPerMs / previousScale.current;
    }
    previousScale.current = pixelsPerMs;
  }, [pixelsPerMs]);

  useEffect(() => {
    if (loading || error || scrolledDay.current === start || !scroller.current) return;
    const initialTime = blocks[0]?.start ?? now;
    scroller.current.scrollTop = zoom === "day" ? 0 : Math.max(0, y(initialTime) - 80);
    scrolledDay.current = start;
  }, [loading, start, entries, error]);

  return (
    <>
      <div class="drag-region flex items-center px-5 pt-7 pb-3 shrink-0">
        <h1 class="text-[15px] font-semibold text-text-primary">Today</h1>
        <span class="text-xs text-text-muted ml-auto tabular-nums">{today}</span>
      </div>

      {entries.length > 0 && (
        <div class="flex items-center gap-5 px-5 pb-4 shrink-0">
          <DonutChart segments={segments} />
          <div class="flex flex-col gap-1.5">
            {segments.map((seg) => (
              <div key={seg.key} class="flex items-center gap-2">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  style={{ background: seg.color }}
                />
                <span class="text-[12px] text-text-muted">{seg.label}</span>
                <span class="text-[12px] text-text-faint tabular-nums ml-auto pl-3">
                  {formatDuration(seg.ms)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div class="flex items-center gap-2 px-5 py-2 border-t border-surface-raised text-[11px] text-text-muted shrink-0">
        <span>{entries.length ? "Click a task to edit" : "No entries yet today"}</span>
        <select aria-label="Timeline zoom" class="ml-auto bg-surface-raised text-text-secondary rounded px-2 py-1 cursor-pointer"
          value={zoom} onChange={(event) => setZoom(event.currentTarget.value)}>
          <option value="day">Entire day</option>
          <option value="compact">Compact</option>
          <option value="detail">Detailed</option>
        </select>
        <button class="text-accent cursor-pointer" onClick={() => {
          if (scroller.current) scroller.current.scrollTop = Math.max(0, y(now) - 100);
        }}>Now ↓</button>
      </div>

      {error && <div role="alert" class="px-5 py-2 text-xs text-red-400">
        {error} <button class="underline cursor-pointer" onClick={load}>Retry</button>
      </div>}
      <div ref={scroller} class="flex-1 min-h-0 overflow-y-auto px-5 pb-5" aria-label="Today's timeline" aria-busy={loading}>
        {loading ? <p class="text-xs text-text-muted py-4">Loading task logs…</p> : (
          <div class={`day-timeline ${zoom === "day" ? "timeline-fit" : ""}`} style={{ height: y(end) }}>
            {ticks.map((tick) => <div key={tick} class={`timeline-hour ${new Date(tick).getMinutes() === 30 ? "timeline-half-hour" : ""}`} style={{ top: y(tick) }}>
              <span>{formatTime(tick)}</span><div />
            </div>)}
            <div class="timeline-hour" style={{ top: y(end) }}><span>24:00</span><div /></div>
            <div class="timeline-track">
              {now < end && <div class="timeline-future" style={{ top: y(now), height: y(end) - y(now) }} />}
              {gaps.map((gap) => <div key={gap.start} class="timeline-gap"
                style={{ top: y(gap.start), height: (gap.end - gap.start) * pixelsPerMs }}>
                {(gap.end - gap.start) * pixelsPerMs >= 24 && <span>
                  {formatDuration(gap.end - gap.start)} unlogged
                  <span class="gap-range"> · {formatTime(gap.start)}–{formatTime(gap.end)}</span>
                </span>}
              </div>)}
              {blocks.map(({ entry, start: blockStart, end: blockEnd, lane, lanes }) => (
                <button key={entry.id} class={`timeline-entry ${zoom !== "detail" ? "timeline-entry-compact" : ""}`} onClick={() => setEditing(entry)}
                  aria-label={`Edit ${entry.content}, ${formatTime(entry.interval_start)} to ${formatTime(entry.interval_end)}, ${entryLabel(entry.category)}`}
                  title={`${entry.content}\n${formatTime(entry.interval_start)}–${formatTime(entry.interval_end)} · ${entryLabel(entry.category)} · Click to edit`}
                  style={{ top: y(blockStart), height: (blockEnd - blockStart) * pixelsPerMs,
                    left: `calc(${lane / lanes * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)`,
                    borderColor: CATEGORY_META[entry.category ?? "none"].color }}>
                  {(blockEnd - blockStart) * pixelsPerMs >= 14 && <span class="timeline-entry-title">{entry.content}</span>}
                  {(blockEnd - blockStart) * pixelsPerMs >= 36 && <span class="timeline-entry-time">{formatTime(entry.interval_start)}–{formatTime(entry.interval_end)} · {formatDuration(blockEnd - blockStart)}</span>}
                  {(blockEnd - blockStart) * pixelsPerMs >= 64 && <span class="timeline-entry-category"
                    style={{ color: CATEGORY_META[entry.category ?? "none"].color }}>{entryLabel(entry.category)}</span>}
                </button>
              ))}
              <div class="timeline-now" style={{ top: y(now) }}><span>Now {formatTime(now)}</span></div>
            </div>
          </div>
        )}
      </div>
      <div class="px-5 py-3 border-t border-surface-raised text-xs text-text-muted shrink-0">
        {entries.length} {entries.length === 1 ? "entry" : "entries"} · {formatDuration(totalMs)} logged · {formatDuration(gapMs)} unlogged so far
      </div>
      {editing && <EditEntry key={editing.id} entry={editing} onClose={() => setEditing(null)} onSaved={() => {
        setEditing(null);
        load();
      }} />}
    </>
  );
}

render(<TimelineWindow />, document.getElementById("app")!);
