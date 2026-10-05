import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import type SQLite from "better-sqlite3";
import { runMigrations } from "../src/main/db/migrations";
import { addEntry, getEntriesForDay, updateEntry } from "../src/main/db/queries";
import type { EntryUpdate } from "../src/shared/types";

// Exercise the production SQL against an isolated SQLite database.
function withDatabase(run: (db: SQLite.Database) => void) {
  const sqlite = new Database(":memory:");
  try {
    const db = sqlite as unknown as SQLite.Database;
    runMigrations(db);
    run(db);
  } finally { sqlite.close(); }
}

describe("task log editing", () => {
  test("persists all editable fields and preserves identity and creation time", () => withDatabase((db) => {
    const original = addEntry(db, "Original", 100, 200, null);
    const edited = updateEntry(db, original.id, {
      content: "  Updated task  ", category: "focus_3", interval_start: 300, interval_end: 500,
    });
    expect(edited).toEqual({ ...original, content: "Updated task", category: "focus_3", interval_start: 300, interval_end: 500 });
    expect(db.prepare("SELECT * FROM entries WHERE id = ?").get(original.id)).toEqual(edited);
    expect(updateEntry(db, original.id, { ...edited, category: null }).category).toBeNull();
  }));

  test("invalid edits leave the stored log intact", () => withDatabase((db) => {
    const original = addEntry(db, "Original", 100, 200, null);
    const invalid = [
      { content: " " }, { interval_end: 100 }, { interval_start: NaN },
      { interval_end: Infinity }, { category: "invalid" }, { interval_start: 9e15 },
    ];
    for (const change of invalid) {
      expect(() => updateEntry(db, original.id, { ...original, ...change } as EntryUpdate)).toThrow();
    }
    expect(db.prepare("SELECT * FROM entries WHERE id = ?").get(original.id)).toEqual(original);
    expect(() => updateEntry(db, 999, original)).toThrow("no longer exists");
  }));

  test("today includes crossing-midnight logs and excludes adjacent days", () => withDatabase((db) => {
    const date = new Date(2026, 9, 5);
    const start = date.getTime();
    const end = new Date(2026, 9, 6).getTime();
    addEntry(db, "Previous day", start - 200, start, null);
    const crossing = addEntry(db, "Crossing midnight", start - 100, start + 100, null);
    const late = addEntry(db, "Late", end - 100, end + 100, null);
    addEntry(db, "Next day", end, end + 100, null);
    expect(getEntriesForDay(db, date).map((entry) => entry.id)).toEqual([crossing.id, late.id]);
    updateEntry(db, crossing.id, { ...crossing, interval_start: end, interval_end: end + 200 });
    expect(getEntriesForDay(db, date).map((entry) => entry.id)).toEqual([late.id]);
  }));
});
