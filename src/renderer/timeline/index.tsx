/** @jsxImportSource preact */
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { api } from "../shared/ipc-api";
import { formatTime, formatDate, formatDuration } from "../shared/formatters";
import type { Entry } from "../../shared/types";

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

  return (
    <>
      <div class="flex items-center px-5 pt-7 pb-3 shrink-0">
        <h1 class="text-[15px] font-semibold text-text-primary">Today</h1>
        <span class="text-xs text-text-muted ml-auto tabular-nums">{today}</span>
      </div>

      <div class="flex-1 overflow-y-auto px-5 pb-5">
        {loading ? null : entries.length === 0 ? (
          <div class="flex flex-col items-center justify-center h-full text-text-ghost text-sm gap-2">
            <span class="text-3xl">○</span>
            <span>No entries yet today</span>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} class="flex gap-3.5 py-2.5 border-b border-surface-raised last:border-b-0">
              <div class="text-[11px] text-text-faint tabular-nums whitespace-nowrap pt-0.5">
                {formatTime(entry.interval_start)} – {formatTime(entry.interval_end)}
              </div>
              <div class="text-sm leading-relaxed text-text-secondary">{entry.content}</div>
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
