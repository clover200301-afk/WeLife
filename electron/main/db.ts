import Database from 'better-sqlite3'
import { app, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const dbDir = path.join(app.getPath('userData'), 'welife')
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
    db = new Database(path.join(dbDir, 'welife.db'))
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema()
  }
  return db
}

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'private',
      unread INTEGER DEFAULT 0,
      last_message TEXT DEFAULT '',
      last_msg_type TEXT DEFAULT 'text',
      last_sender TEXT DEFAULT '',
      last_timestamp INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      timestamp INTEGER NOT NULL,
      is_self INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (chat_id) REFERENCES chats(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      chat_name TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      message_ids TEXT NOT NULL DEFAULT '[]',
      note TEXT,
      manual_edited INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (chat_id) REFERENCES chats(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_chat_id ON events(chat_id);
    CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_analyses (
      id TEXT PRIMARY KEY,
      event_id TEXT,
      chat_id TEXT NOT NULL,
      chat_name TEXT NOT NULL,
      analysis_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (chat_id) REFERENCES chats(id)
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_chat_id ON chat_analyses(chat_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_event_id ON chat_analyses(event_id);
  `)
}

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

// Encrypted variants for sensitive values (API keys).
// Uses Electron safeStorage → macOS Keychain / Windows DPAPI.
// Stored in DB as "enc:<base64>". Falls back to plaintext for migration.
export function getSecureSetting(key: string): string | null {
  const raw = getSetting(key)
  if (!raw) return null
  if (!raw.startsWith('enc:')) return raw  // legacy plaintext, still readable
  try {
    const buf = Buffer.from(raw.slice(4), 'base64')
    return safeStorage.decryptString(buf)
  } catch {
    return null
  }
}

export function setSecureSetting(key: string, value: string): void {
  if (!value) { setSetting(key, ''); return }
  const encrypted = safeStorage.encryptString(value)
  setSetting(key, 'enc:' + encrypted.toString('base64'))
}
