import type { Db } from '../db';
import type { Device, DeviceStatus, MonitorMode } from '../../src/types/monitor';

export interface DeviceRow {
  id: number;
  mode: MonitorMode;
  name: string;
  ip_address: string;
  status: DeviceStatus;
  consecutive_failures: number;
  last_rtt_ms: number | null;
  last_checked_at: string | null;
  last_status_change_at: string | null;
}

export interface DeviceStateUpdate {
  status: DeviceStatus;
  consecutiveFailures: number;
  rttMs: number | null;
  checkedAt: string;
  statusChangedAt: string | null;
}

const DEVICE_COLUMNS = `id, mode, name, ip_address, status, consecutive_failures,
  last_rtt_ms, last_checked_at, last_status_change_at`;

export function toDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    name: row.name,
    ipAddress: row.ip_address,
    status: row.status,
    lastRttMs: row.last_rtt_ms,
    lastCheckedAt: row.last_checked_at,
    lastStatusChangeAt: row.last_status_change_at,
  };
}

export function listDeviceRows(db: Db, mode: MonitorMode): DeviceRow[] {
  return db
    .prepare(`SELECT ${DEVICE_COLUMNS} FROM devices WHERE mode = ? ORDER BY id`)
    .all(mode) as DeviceRow[];
}

export function findDeviceRow(db: Db, id: number): DeviceRow | undefined {
  return db.prepare(`SELECT ${DEVICE_COLUMNS} FROM devices WHERE id = ?`).get(id) as
    | DeviceRow
    | undefined;
}

export function insertDevice(db: Db, mode: MonitorMode, name: string, ipAddress: string): number {
  const result = db
    .prepare('INSERT INTO devices (mode, name, ip_address, created_at) VALUES (?, ?, ?, ?)')
    .run(mode, name, ipAddress, new Date().toISOString());
  return Number(result.lastInsertRowid);
}

export function updateDeviceDetails(db: Db, id: number, name: string, ipAddress: string) {
  db.prepare('UPDATE devices SET name = ?, ip_address = ? WHERE id = ?').run(name, ipAddress, id);
}

export function deleteDeviceRow(db: Db, id: number): boolean {
  return db.prepare('DELETE FROM devices WHERE id = ?').run(id).changes > 0;
}

export function updateDeviceState(db: Db, id: number, update: DeviceStateUpdate) {
  db.prepare(
    `UPDATE devices
     SET status = ?, consecutive_failures = ?, last_rtt_ms = ?, last_checked_at = ?,
         last_status_change_at = COALESCE(?, last_status_change_at)
     WHERE id = ?`
  ).run(
    update.status,
    update.consecutiveFailures,
    update.rttMs,
    update.checkedAt,
    update.statusChangedAt,
    id
  );
}
