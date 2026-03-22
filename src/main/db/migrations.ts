import Database from "better-sqlite3";

export function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`);

  const row = db.prepare("SELECT version FROM schema_version").get() as
    | { version: number }
    | undefined;
  const version = row?.version ?? 0;

  if (version < 1) {
    db.exec(`
      CREATE TABLE entries (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        content        TEXT NOT NULL,
        interval_start INTEGER NOT NULL,
        interval_end   INTEGER NOT NULL,
        created_at     INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
      );
      CREATE INDEX idx_entries_interval_start ON entries(interval_start);

      CREATE TABLE config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    if (version === 0) {
      db.exec(`INSERT INTO schema_version VALUES (1)`);
    } else {
      db.exec(`UPDATE schema_version SET version = 1`);
    }
  }
}
