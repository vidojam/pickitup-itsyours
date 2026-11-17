import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "store.db");

// Persist across Next.js hot-module reloads in dev mode.
const g = globalThis as unknown as { _db?: Database.Database };

export function getDb(): Database.Database {
  if (!g._db) {
    mkdirSync(DATA_DIR, { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    applySchema(db);
    g._db = db;
  }
  return g._db;
}

function applySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id                  TEXT PRIMARY KEY,
      imageUrls           TEXT NOT NULL DEFAULT '[]',
      offerAmount         INTEGER NOT NULL,
      timeViewed          TEXT NOT NULL DEFAULT '',
      location            TEXT NOT NULL DEFAULT '',
      address             TEXT,
      category            TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'available',
      createdAt           TEXT NOT NULL,
      updatedAt           TEXT NOT NULL,
      activeReservationId TEXT
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id              TEXT PRIMARY KEY,
      itemId          TEXT NOT NULL REFERENCES items(id),
      paymentIntentId TEXT NOT NULL UNIQUE,
      amount          INTEGER NOT NULL,
      status          TEXT NOT NULL DEFAULT 'authorized',
      createdAt       TEXT NOT NULL,
      updatedAt       TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);

    CREATE TABLE IF NOT EXISTS admin_sessions (
      tokenHash TEXT PRIMARY KEY,
      expiresAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_mobile_links (
      tokenHash TEXT PRIMARY KEY,
      expiresAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      ts      TEXT NOT NULL,
      action  TEXT NOT NULL,
      ip      TEXT,
      details TEXT NOT NULL DEFAULT '{}'
    );
  `);
}
