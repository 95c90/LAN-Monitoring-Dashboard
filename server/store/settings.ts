import type { Db } from '../db';
import type { MonitorMode } from '../../src/types/monitor';

export function getSetting(db: Db, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSetting(db: Db, key: string, value: string) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

export function getMode(db: Db): MonitorMode {
  return getSetting(db, 'mode') === 'real' ? 'real' : 'demo';
}

export function getIntervalSeconds(db: Db): number {
  const value = Number(getSetting(db, 'interval_seconds'));
  return Number.isFinite(value) && value >= 5 ? value : 10;
}
