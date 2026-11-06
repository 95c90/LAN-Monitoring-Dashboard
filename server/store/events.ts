import type { Db } from '../db';
import type { EventType, MonitorEvent, MonitorMode } from '../../src/types/monitor';

interface EventRow {
  id: number;
  device_id: number | null;
  device_name: string;
  ip_address: string;
  type: EventType;
  message: string;
  created_at: string;
}

export interface NewEvent {
  mode: MonitorMode;
  deviceId: number | null;
  deviceName: string;
  ipAddress: string;
  type: EventType;
  message: string;
}

export function insertEvent(db: Db, event: NewEvent) {
  db.prepare(
    `INSERT INTO events (mode, device_id, device_name, ip_address, type, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    event.mode,
    event.deviceId,
    event.deviceName,
    event.ipAddress,
    event.type,
    event.message,
    new Date().toISOString()
  );
}

export function listEvents(db: Db, mode: MonitorMode, limit: number): MonitorEvent[] {
  const rows = db
    .prepare(
      `SELECT id, device_id, device_name, ip_address, type, message, created_at
       FROM events WHERE mode = ? ORDER BY id DESC LIMIT ?`
    )
    .all(mode, limit) as EventRow[];

  return rows.map((row) => ({
    id: row.id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    ipAddress: row.ip_address,
    type: row.type,
    message: row.message,
    createdAt: row.created_at,
  }));
}
