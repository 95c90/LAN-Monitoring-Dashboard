import type { Db } from './db';
import { getIntervalSeconds, getMode, setSetting } from './store/settings';
import { findDeviceRow, listDeviceRows, updateDeviceState } from './store/devices';
import { insertCheck, pruneChecks } from './store/checks';
import { insertEvent } from './store/events';
import { pingHost, simulatePing, type PingResult } from './ping';
import type { DeviceStatus, MonitorMode } from '../src/types/monitor';

const FAILURE_THRESHOLD = 2;
const CONCURRENT_CHECKS = 8;
const CHECK_RETENTION_MS = 2 * 24 * 60 * 60 * 1000;
const MAINTENANCE_INTERVAL_MS = 60 * 60 * 1000;

export interface Monitor {
  start(): void;
  stop(): void;
  reschedule(): void;
}

function resolveNextStatus(
  current: DeviceStatus,
  online: boolean,
  consecutiveFailures: number
): DeviceStatus {
  if (online) return 'online';
  return consecutiveFailures >= FAILURE_THRESHOLD ? 'offline' : current;
}

function describeChange(status: DeviceStatus, rttMs: number | null): string {
  if (status === 'online') {
    return rttMs === null ? 'الجهاز متصل ويستجيب للفحص' : `الجهاز متصل، زمن الاستجابة ${rttMs} ms`;
  }
  return 'انقطع الاتصال بالجهاز ولم يستجب لعدة فحوصات متتالية';
}

async function runWithConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await task(item);
    }
  });
  await Promise.all(workers);
}

export function createMonitor(db: Db, publish: () => void): Monitor {
  let timer: NodeJS.Timeout | null = null;
  let cycleInProgress = false;
  let stopped = false;
  let lastMaintenanceAt = 0;

  function applyResult(mode: MonitorMode, deviceId: number, result: PingResult) {
    const device = findDeviceRow(db, deviceId);
    if (!device || device.mode !== mode) return;

    const checkedAt = new Date().toISOString();
    const consecutiveFailures = result.online ? 0 : device.consecutive_failures + 1;
    const nextStatus = resolveNextStatus(device.status, result.online, consecutiveFailures);
    const changed = nextStatus !== device.status;

    db.transaction(() => {
      insertCheck(db, deviceId, result.online, result.rttMs, checkedAt);
      updateDeviceState(db, deviceId, {
        status: nextStatus,
        consecutiveFailures,
        rttMs: result.online ? result.rttMs : null,
        checkedAt,
        statusChangedAt: changed ? checkedAt : null,
      });
      if (changed) {
        insertEvent(db, {
          mode,
          deviceId,
          deviceName: device.name,
          ipAddress: device.ip_address,
          type: nextStatus === 'online' ? 'online' : 'offline',
          message: describeChange(nextStatus, result.rttMs),
        });
      }
    })();
  }

  async function checkDevice(mode: MonitorMode, deviceId: number, hadError: { value: boolean }) {
    const device = findDeviceRow(db, deviceId);
    if (!device || device.mode !== mode) return;

    let result: PingResult;
    try {
      result = mode === 'demo' ? simulatePing() : await pingHost(device.ip_address);
    } catch {
      hadError.value = true;
      return;
    }
    applyResult(mode, deviceId, result);
  }

  function maintain() {
    if (Date.now() - lastMaintenanceAt < MAINTENANCE_INTERVAL_MS) return;
    lastMaintenanceAt = Date.now();
    pruneChecks(db, new Date(Date.now() - CHECK_RETENTION_MS).toISOString());
  }

  async function runCycle() {
    const mode = getMode(db);
    const devices = listDeviceRows(db, mode);
    const hadError = { value: false };

    await runWithConcurrency(devices, CONCURRENT_CHECKS, (device) =>
      checkDevice(mode, device.id, hadError)
    );

    if (hadError.value) {
      insertEvent(db, {
        mode,
        deviceId: null,
        deviceName: 'النظام',
        ipAddress: '-',
        type: 'monitor_error',
        message: 'تعذر تنفيذ أمر الفحص على هذا الجهاز. تأكد من توفر أمر ping في نظام التشغيل.',
      });
    }

    setSetting(db, 'last_cycle_at', new Date().toISOString());
    maintain();
    publish();
  }

  async function tick() {
    if (cycleInProgress || stopped) return;
    cycleInProgress = true;
    try {
      await runCycle();
    } finally {
      cycleInProgress = false;
    }
    if (!stopped) {
      timer = setTimeout(() => void tick(), getIntervalSeconds(db) * 1000);
    }
  }

  return {
    start() {
      stopped = false;
      void tick();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
    reschedule() {
      if (timer) clearTimeout(timer);
      timer = null;
      stopped = false;
      void tick();
    },
  };
}
