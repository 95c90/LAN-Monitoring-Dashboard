import express, { type Request, type Response } from 'express';
import type { Db } from './db';
import {
  checkCredentials,
  clearLoginAttempts,
  clearSessionCookie,
  consumeLoginAttempt,
  createFirstAdmin,
  createSession,
  deleteSession,
  findSessionUsername,
  hasAdmin,
  readSessionToken,
  requireAdmin,
  setSessionCookie,
} from './auth';
import type { Monitor } from './monitor';
import { buildDashboardState } from './snapshot';
import { parsePrivateIPv4 } from './network';
import { getMode, setSetting } from './store/settings';
import {
  deleteDeviceRow,
  findDeviceRow,
  insertDevice,
  updateDeviceDetails,
} from './store/devices';
import { insertEvent, listEvents } from './store/events';
import { listAvailability, listHistory } from './store/checks';
import type { MonitorMode } from '../src/types/monitor';

interface ApiDeps {
  db: Db;
  monitor: Monitor;
  publish: () => void;
}

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;
const SYSTEM_NAME = 'النظام';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readString(body: unknown, key: string): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

function validateDeviceInput(body: unknown): { name: string; ipAddress: string } | string {
  const name = readString(body, 'name')?.trim() ?? '';
  if (name.length < 1 || name.length > 60) return 'اسم الجهاز يجب أن يكون بين حرف و60 حرفًا.';

  const ipAddress = parsePrivateIPv4(readString(body, 'ipAddress') ?? '');
  if (!ipAddress) {
    return 'أدخل عنوان IP خاصًا بالشبكة المحلية، مثل 192.168.1.10 أو 10.0.0.5 أو 127.0.0.1.';
  }
  return { name, ipAddress };
}

function sendNotFound(res: Response) {
  res.status(404).json({ error: 'العنصر المطلوب غير موجود.' });
}

function registerAuthRoutes(router: express.Router, deps: ApiDeps) {
  const { db } = deps;

  router.get('/auth/status', (req: Request, res: Response) => {
    const token = readSessionToken(req.headers.cookie);
    const username = token ? findSessionUsername(db, token) : null;
    res.json({ setupRequired: !hasAdmin(db), authenticated: Boolean(username), username });
  });

  router.post('/auth/setup', (req: Request, res: Response) => {
    const username = readString(req.body, 'username')?.trim() ?? '';
    const password = readString(req.body, 'password') ?? '';
    if (!USERNAME_PATTERN.test(username)) {
      res.status(400).json({ error: 'اسم المستخدم يجب أن يتكون من 3 إلى 32 حرفًا إنجليزيًا أو أرقام أو _ . -' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'كلمة المرور يجب أن تكون بين 8 و128 حرفًا.' });
      return;
    }
    if (!createFirstAdmin(db, username, password)) {
      res.status(409).json({ error: 'تم إعداد حساب المدير مسبقًا.' });
      return;
    }
    const userId = checkCredentials(db, username, password);
    if (userId === null) {
      res.status(500).json({ error: 'تعذر إنشاء الجلسة، حاول مرة أخرى.' });
      return;
    }
    setSessionCookie(res, createSession(db, userId));
    res.status(201).json({ username });
  });

  router.post('/auth/login', (req: Request, res: Response) => {
    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!consumeLoginAttempt(ip)) {
      res.status(429).json({ error: 'محاولات كثيرة لتسجيل الدخول. انتظر ربع ساعة ثم حاول مجددًا.' });
      return;
    }
    const username = readString(req.body, 'username')?.trim() ?? '';
    const password = readString(req.body, 'password') ?? '';
    const userId = username && password ? checkCredentials(db, username, password) : null;
    if (userId === null) {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
      return;
    }
    clearLoginAttempts(ip);
    setSessionCookie(res, createSession(db, userId));
    res.json({ username });
  });

  router.post('/auth/logout', (req: Request, res: Response) => {
    const token = readSessionToken(req.headers.cookie);
    if (token) deleteSession(db, token);
    clearSessionCookie(res);
    res.status(204).end();
  });
}

function registerProtectedRoutes(router: express.Router, deps: ApiDeps) {
  const { db, monitor, publish } = deps;

  router.get('/dashboard', (_req, res) => {
    res.json(buildDashboardState(db));
  });

  router.post('/devices', (req, res) => {
    const input = validateDeviceInput(req.body);
    if (typeof input === 'string') {
      res.status(400).json({ error: input });
      return;
    }
    const mode = getMode(db);
    try {
      const id = insertDevice(db, mode, input.name, input.ipAddress);
      insertEvent(db, {
        mode,
        deviceId: id,
        deviceName: input.name,
        ipAddress: input.ipAddress,
        type: 'device_added',
        message: 'تمت إضافة الجهاز إلى قائمة المراقبة',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        res.status(409).json({ error: 'عنوان IP هذا مضاف مسبقًا.' });
        return;
      }
      throw error;
    }
    publish();
    monitor.reschedule();
    res.status(201).json(buildDashboardState(db));
  });

  router.put('/devices/:id', (req, res) => {
    const id = parseId(req.params.id);
    const device = id === null ? undefined : findDeviceRow(db, id);
    if (!device || device.mode !== getMode(db)) return sendNotFound(res);

    const input = validateDeviceInput(req.body);
    if (typeof input === 'string') {
      res.status(400).json({ error: input });
      return;
    }
    try {
      updateDeviceDetails(db, device.id, input.name, input.ipAddress);
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        res.status(409).json({ error: 'عنوان IP هذا مضاف مسبقًا لجهاز آخر.' });
        return;
      }
      throw error;
    }
    insertEvent(db, {
      mode: device.mode,
      deviceId: device.id,
      deviceName: input.name,
      ipAddress: input.ipAddress,
      type: 'device_updated',
      message: 'تم تعديل بيانات الجهاز',
    });
    publish();
    monitor.reschedule();
    res.json(buildDashboardState(db));
  });

  router.delete('/devices/:id', (req, res) => {
    const id = parseId(req.params.id);
    const device = id === null ? undefined : findDeviceRow(db, id);
    if (!device || device.mode !== getMode(db)) return sendNotFound(res);

    db.transaction(() => {
      deleteDeviceRow(db, device.id);
      insertEvent(db, {
        mode: device.mode,
        deviceId: null,
        deviceName: device.name,
        ipAddress: device.ip_address,
        type: 'device_deleted',
        message: 'تم حذف الجهاز من قائمة المراقبة',
      });
    })();
    publish();
    res.json(buildDashboardState(db));
  });

  router.get('/devices/:id/history', (req, res) => {
    const id = parseId(req.params.id);
    const device = id === null ? undefined : findDeviceRow(db, id);
    if (!device || device.mode !== getMode(db)) return sendNotFound(res);

    const limit = clampInt(req.query.limit, 60, 1, 500);
    res.json({ points: listHistory(db, device.id, limit) });
  });

  router.get('/stats/availability', (req, res) => {
    const hours = clampInt(req.query.hours, 24, 1, 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    res.json({ items: listAvailability(db, getMode(db), since) });
  });

  router.get('/events', (req, res) => {
    const limit = clampInt(req.query.limit, 200, 1, 500);
    res.json({ events: listEvents(db, getMode(db), limit) });
  });

  router.put('/settings', (req, res) => {
    const current: MonitorMode = getMode(db);
    const requestedMode = readString(req.body, 'mode');
    const interval = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).intervalSeconds : undefined;

    if (requestedMode !== null && requestedMode !== 'demo' && requestedMode !== 'real') {
      res.status(400).json({ error: 'وضع المراقبة غير معروف.' });
      return;
    }
    if (interval !== undefined && (typeof interval !== 'number' || !Number.isInteger(interval) || interval < 5 || interval > 3600)) {
      res.status(400).json({ error: 'فترة الفحص يجب أن تكون بين 5 ثوانٍ وساعة واحدة.' });
      return;
    }

    db.transaction(() => {
      if (interval !== undefined) setSetting(db, 'interval_seconds', String(interval));
      if (requestedMode && requestedMode !== current) {
        setSetting(db, 'mode', requestedMode);
        insertEvent(db, {
          mode: requestedMode,
          deviceId: null,
          deviceName: SYSTEM_NAME,
          ipAddress: '-',
          type: 'mode_changed',
          message:
            requestedMode === 'real'
              ? 'تم التبديل إلى وضع المراقبة الحقيقية باستخدام ping'
              : 'تم التبديل إلى وضع المحاكاة التجريبي',
        });
      }
    })();

    if (interval !== undefined || (requestedMode && requestedMode !== current)) {
      monitor.reschedule();
    }
    publish();
    res.json(buildDashboardState(db));
  });
}

export function createApiRouter(deps: ApiDeps): express.Router {
  const router = express.Router();
  registerAuthRoutes(router, deps);
  router.use(requireAdmin(deps.db));
  registerProtectedRoutes(router, deps);
  router.use((_req, res) => {
    res.status(404).json({ error: 'المسار غير موجود.' });
  });
  return router;
}
