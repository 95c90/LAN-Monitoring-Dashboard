import type { Server as HttpServer } from 'node:http';
import express from 'express';
import { pruneExpiredSessions } from './auth';
import { openDatabase } from './db';
import { createMonitor } from './monitor';
import { createRealtimeHub } from './realtime';
import { createApiRouter } from './routes';

const SESSION_SWEEP_MS = 60 * 60 * 1000;

export function createMonitorApi(httpServer: HttpServer) {
  const db = openDatabase();
  const hub = createRealtimeHub(httpServer, db);
  const monitor = createMonitor(db, hub.publish);

  const router = express.Router();
  router.use(express.json({ limit: '16kb' }));
  router.use(createApiRouter({ db, monitor, publish: hub.publish }));

  setInterval(() => pruneExpiredSessions(db), SESSION_SWEEP_MS).unref();

  return { router, start: () => monitor.start() };
}
