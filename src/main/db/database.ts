import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import { runMigrations } from "./migrations";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath("userData"), "chicanery.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    runMigrations(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
