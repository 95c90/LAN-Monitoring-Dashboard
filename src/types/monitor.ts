export type MonitorMode = 'demo' | 'real';

export type DeviceStatus = 'online' | 'offline' | 'unknown';

export type EventType =
  | 'online'
  | 'offline'
  | 'device_added'
  | 'device_updated'
  | 'device_deleted'
  | 'mode_changed'
  | 'monitor_error';

export interface Device {
  id: number;
  name: string;
  ipAddress: string;
  status: DeviceStatus;
  lastRttMs: number | null;
  lastCheckedAt: string | null;
  lastStatusChangeAt: string | null;
}

export interface MonitorEvent {
  id: number;
  deviceId: number | null;
  deviceName: string;
  ipAddress: string;
  type: EventType;
  message: string;
  createdAt: string;
}

export interface DashboardState {
  mode: MonitorMode;
  intervalSeconds: number;
  lastCycleAt: string | null;
  devices: Device[];
}

export interface HistoryPoint {
  checkedAt: string;
  online: boolean;
  rttMs: number | null;
}

export interface AvailabilityItem {
  deviceId: number;
  name: string;
  ipAddress: string;
  checks: number;
  onlineChecks: number;
  availabilityPercent: number | null;
}

export interface AuthStatus {
  setupRequired: boolean;
  authenticated: boolean;
  username: string | null;
}

export type ServerMessage = { type: 'snapshot'; data: DashboardState };
