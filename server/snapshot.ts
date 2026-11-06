import type { Db } from './db';
import { getIntervalSeconds, getMode, getSetting } from './store/settings';
import { listDeviceRows, toDevice } from './store/devices';
import type { DashboardState } from '../src/types/monitor';

export function buildDashboardState(db: Db): DashboardState {
  const mode = getMode(db);
  return {
    mode,
    intervalSeconds: getIntervalSeconds(db),
    lastCycleAt: getSetting(db, 'last_cycle_at') ?? null,
    devices: listDeviceRows(db, mode).map(toDevice),
  };
}
