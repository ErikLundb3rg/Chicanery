import Database from "better-sqlite3";
import type { Entry, EntryUpdate } from "../../shared/types";

export function updateEntry(db: Database.Database, id: number, update: EntryUpdate): Entry {
  const categories = ["focus_1", "focus_2", "focus_3", "maintenance"];
  if (!Number.isSafeInteger(id) || id < 1 || !update ||
      typeof update.content !== "string" || !update.content.trim() ||
      (update.category !== null && !categories.includes(update.category)) ||
      !Number.isSafeInteger(update.interval_start) || !Number.isSafeInteger(update.interval_end) ||
      !Number.isFinite(new Date(update.interval_start).getTime()) ||
      !Number.isFinite(new Date(update.interval_end).getTime()) ||
      update.interval_end <= update.interval_start) {
    throw new Error("Enter a task and a valid time range with the end after the start.");
  }
  const entry = db.prepare(`UPDATE entries
    SET content = ?, category = ?, interval_start = ?, interval_end = ?
    WHERE id = ? RETURNING *`).get(
      update.content.trim(), update.category, update.interval_start, update.interval_end, id
    ) as Entry | undefined;
  if (!entry) throw new Error("This log no longer exists.");
  return entry;
}

export function addEntry(
  db: Database.Database,
  content: string,
  intervalStart: number,
  intervalEnd: number,
  category: string | null
): Entry {
  const stmt = db.prepare(
    `INSERT INTO entries (content, interval_start, interval_end, category)
     VALUES (?, ?, ?, ?)
     RETURNING *`
  );
  return stmt.get(content, intervalStart, intervalEnd, category) as Entry;
}

export function hasEntryForInterval(
  db: Database.Database,
  intervalStart: number,
  intervalEnd: number
): boolean {
  const row = db
    .prepare("SELECT 1 FROM entries WHERE interval_start = ? AND interval_end = ? LIMIT 1")
    .get(intervalStart, intervalEnd);
  return row !== undefined;
}

export function getEntriesForDay(db: Database.Database, date: Date): Entry[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  return db
    .prepare(
      `SELECT * FROM entries
       WHERE interval_end > ? AND interval_start < ?
       ORDER BY interval_start ASC`
    )
    .all(start.getTime(), end.getTime()) as Entry[];
}

export function getEntriesForRange(
  db: Database.Database,
  start: Date,
  end: Date
): Entry[] {
  return db
    .prepare(
      `SELECT * FROM entries
       WHERE interval_start >= ? AND interval_start <= ?
       ORDER BY interval_start ASC`
    )
    .all(start.getTime(), end.getTime()) as Entry[];
}

export function getConfigValue(
  db: Database.Database,
  key: string
): string | undefined {
  const row = db
    .prepare("SELECT value FROM config WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export function setConfigValue(
  db: Database.Database,
  key: string,
  value: string
): void {
  db.prepare(
    `INSERT INTO config (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}
