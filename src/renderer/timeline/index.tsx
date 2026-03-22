/** @jsxImportSource preact */
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { api } from "../shared/ipc-api";
import { formatTime, formatDate, formatDuration } from "../shared/formatters";
import type { Entry, Category } from "../../shared/types";

const CATEGORY_META: Record<Category | "none", { label: string; color: string }> = {
  focus_3:     { label: "Focus 3",      color: "#0a84ff" },
  focus_2:     { label: "Focus 2",      color: "#5ac8fa" },
  focus_1:     { label: "Focus 1",      color: "#6e6e73" },
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

function computeSegments(entries: Entry[]): Segment[] {
  const durations: Partial<Record<Category | "none", number>> = {};
  for (const entry of entries) {
    const key = (entry.category ?? "none") as Category | "none";
    durations[key] = (durations[key] ?? 0) + (entry.interval_end - entry.interval_start);
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

  async function load() {
    const data = await api.getEntriesForToday();
    setEntries([...data].reverse());
    setLoading(false);
  }

  useEffect(() => {
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const totalMs = entries.reduce((sum, e) => sum + (e.interval_end - e.interval_start), 0);
  const today = formatDate(new Date());
  const segments = computeSegments(entries);

  return (
    <>
      <div class="flex items-center px-5 pt-7 pb-3 shrink-0">
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

      <div class="flex-1 overflow-y-auto px-5 pb-5 border-t border-surface-raised">
        {loading ? null : entries.length === 0 ? (
          <div class="flex flex-col items-center justify-center h-full text-text-ghost text-sm gap-2">
            <span class="text-3xl">○</span>
            <span>No entries yet today</span>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} class="flex items-baseline gap-2.5 py-2 border-b border-surface-raised last:border-b-0">
              <span class="text-[11px] text-text-faint tabular-nums whitespace-nowrap shrink-0">
                {formatTime(entry.interval_start)}–{formatTime(entry.interval_end)}
              </span>
              {entry.category && (
                <span class="text-[10px] font-semibold uppercase tracking-wider shrink-0"
                  style={{ color: CATEGORY_META[entry.category].color }}>
                  {entryLabel(entry.category)}
                </span>
              )}
              <span class="text-sm text-text-secondary min-w-0 truncate">{entry.content}</span>
            </div>
          ))
        )}
      </div>

      {entries.length > 0 && (
        <div class="px-5 py-3 border-t border-surface-raised text-xs text-text-muted shrink-0">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} · {formatDuration(totalMs)} logged
        </div>
      )}
    </>
  );
}

render(<TimelineWindow />, document.getElementById("app")!);
