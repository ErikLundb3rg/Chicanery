import Database from "better-sqlite3";
import type { Entry } from "../../shared/types";

export function addEntry(
  db: Database.Database,
  content: string,
  intervalStart: number,
  intervalEnd: number
): Entry {
  const stmt = db.prepare(
    `INSERT INTO entries (content, interval_start, interval_end)
     VALUES (?, ?, ?)
     RETURNING *`
  );
  return stmt.get(content, intervalStart, intervalEnd) as Entry;
}

export function getEntriesForDay(db: Database.Database, date: Date): Entry[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return db
    .prepare(
      `SELECT * FROM entries
       WHERE interval_start >= ? AND interval_start <= ?
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
