import type { Db } from '../db';
import type { AvailabilityItem, HistoryPoint, MonitorMode } from '../../src/types/monitor';

interface HistoryRow {
  checked_at: string;
  online: number;
  rtt_ms: number | null;
}

interface AvailabilityRow {
  device_id: number;
  name: string;
  ip_address: string;
  checks: number;
  online_checks: number;
}

export function insertCheck(db: Db, deviceId: number, online: boolean, rttMs: number | null, checkedAt: string) {
  db.prepare('INSERT INTO checks (device_id, online, rtt_ms, checked_at) VALUES (?, ?, ?, ?)').run(
    deviceId,
    online ? 1 : 0,
    rttMs,
    checkedAt
  );
}

export function listHistory(db: Db, deviceId: number, limit: number): HistoryPoint[] {
  const rows = db
    .prepare(
      `SELECT checked_at, online, rtt_ms FROM checks
       WHERE device_id = ? ORDER BY id DESC LIMIT ?`
    )
    .all(deviceId, limit) as HistoryRow[];

  return rows
    .reverse()
    .map((row) => ({ checkedAt: row.checked_at, online: row.online === 1, rttMs: row.rtt_ms }));
}

export function listAvailability(db: Db, mode: MonitorMode, since: string): AvailabilityItem[] {
  const rows = db
    .prepare(
      `SELECT d.id AS device_id, d.name, d.ip_address,
              COUNT(c.id) AS checks,
              COALESCE(SUM(c.online), 0) AS online_checks
       FROM devices d
       LEFT JOIN checks c ON c.device_id = d.id AND c.checked_at >= ?
       WHERE d.mode = ?
       GROUP BY d.id
       ORDER BY d.id`
    )
    .all(since, mode) as AvailabilityRow[];

  return rows.map((row) => ({
    deviceId: row.device_id,
    name: row.name,
    ipAddress: row.ip_address,
    checks: row.checks,
    onlineChecks: row.online_checks,
    availabilityPercent:
      row.checks > 0 ? Math.round((row.online_checks / row.checks) * 1000) / 10 : null,
  }));
}

export function pruneChecks(db: Db, olderThan: string) {
  db.prepare('DELETE FROM checks WHERE checked_at < ?').run(olderThan);
}
