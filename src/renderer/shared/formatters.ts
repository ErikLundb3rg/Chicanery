export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export function formatDuration(ms: number): string {
  let h = Math.floor(ms / 3_600_000);
  let m = Math.round((ms % 3_600_000) / 60_000);
  if (m === 60) { h++; m = 0; }
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
