import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type Db = Database.Database;

const DEMO_SEED_DEVICES = [
  { name: 'خادم الملفات', ipAddress: '192.168.10.10' },
  { name: 'طابعة الطابق الأول', ipAddress: '192.168.10.21' },
  { name: 'نقطة الوصول - الاستقبال', ipAddress: '192.168.10.30' },
  { name: 'كاميرا المدخل الرئيسي', ipAddress: '192.168.10.41' },
  { name: 'حاسب المحاسبة', ipAddress: '192.168.10.52' },
  { name: 'خادم قاعدة البيانات', ipAddress: '192.168.10.60' },
];

function resolveDataDir(): string {
  return process.env.LAN_MONITOR_DATA_DIR ?? path.resolve(process.cwd(), 'data');
}

function createSchema(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK (mode IN ('demo', 'real')),
      name TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown')),
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      last_rtt_ms REAL,
      last_checked_at TEXT,
      last_status_change_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (mode, ip_address)
    );

    CREATE TABLE IF NOT EXISTS checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      online INTEGER NOT NULL,
      rtt_ms REAL,
      checked_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_checks_device_time ON checks (device_id, checked_at);
    CREATE INDEX IF NOT EXISTS idx_checks_time ON checks (checked_at);

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK (mode IN ('demo', 'real')),
      device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
      device_name TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_mode_time ON events (mode, created_at);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function seedDemoDevices(db: Db) {
  const alreadySeeded = db.prepare("SELECT value FROM settings WHERE key = 'demo_seeded'").get();
  if (alreadySeeded) return;

  const insert = db.prepare(
    `INSERT INTO devices (mode, name, ip_address, created_at) VALUES ('demo', ?, ?, ?)`
  );
  const now = new Date().toISOString();
  db.transaction(() => {
    for (const device of DEMO_SEED_DEVICES) insert.run(device.name, device.ipAddress, now);
    db.prepare("INSERT INTO settings (key, value) VALUES ('demo_seeded', '1')").run();
  })();
}

function seedDefaultSettings(db: Db) {
  const defaults: Record<string, string> = {
    mode: process.env.LAN_MONITOR_MODE === 'real' ? 'real' : 'demo',
    interval_seconds: '10',
  };
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) insert.run(key, value);
}

export function openDatabase(): Db {
  const dataDir = resolveDataDir();
  fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(path.join(dataDir, 'lan-monitor.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createSchema(db);
  seedDefaultSettings(db);
  seedDemoDevices(db);
  return db;
}
