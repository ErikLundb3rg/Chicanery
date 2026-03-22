/** @jsxImportSource preact */
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { api } from "../shared/ipc-api";
import type { Entry } from "../../shared/types";

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function TimelineWindow() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await api.getEntriesForToday();
    setEntries(data);
    setLoading(false);
  }

  useEffect(() => {
    load();

    // Refresh when window gains focus
    window.addEventListener("focus", load);

    // Listen for refresh signals from main process
    const handler = () => load();
    window.addEventListener("timeline:refresh", handler);

    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener("timeline:refresh", handler);
    };
  }, []);

  const totalMs = entries.reduce((sum, e) => sum + (e.interval_end - e.interval_start), 0);

  return (
    <>
      <div class="titlebar">
        <h1>Today</h1>
        <span class="date">{formatDate(new Date())}</span>
      </div>

      <div class="entries">
        {loading ? null : entries.length === 0 ? (
          <div class="empty">
            <span class="icon">○</span>
            <span>No entries yet today</span>
          </div>
        ) : (
          [...entries].reverse().map((entry) => (
            <div key={entry.id} class="entry">
              <div class="entry-time">
                {formatTime(entry.interval_start)}<br />
                <span style="color:#48484a">→ {formatTime(entry.interval_end)}</span>
              </div>
              <div class="entry-content">{entry.content}</div>
            </div>
          ))
        )}
      </div>

      {entries.length > 0 && (
        <div class="total">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} · {formatDuration(totalMs)} logged
        </div>
      )}
    </>
  );
}

render(<TimelineWindow />, document.getElementById("app")!);
