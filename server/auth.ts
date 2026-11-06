import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Db } from './db';

const SESSION_COOKIE = 'lanm_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export function hasAdmin(db: Db): boolean {
  return Boolean(db.prepare('SELECT 1 FROM users LIMIT 1').get());
}

export function createFirstAdmin(db: Db, username: string, password: string): boolean {
  const passwordHash = hashPassword(password);
  return db.transaction(() => {
    if (hasAdmin(db)) return false;
    db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)').run(
      username,
      passwordHash,
      new Date().toISOString()
    );
    return true;
  })();
}

export function checkCredentials(db: Db, username: string, password: string): number | null {
  const row = db
    .prepare('SELECT id, password_hash FROM users WHERE username = ?')
    .get(username) as { id: number; password_hash: string } | undefined;
  if (!row) {
    hashPassword(password);
    return null;
  }
  return verifyPassword(password, row.password_hash) ? row.id : null;
}

export function createSession(db: Db, userId: number): string {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    new Date(now).toISOString(),
    new Date(now + SESSION_TTL_MS).toISOString()
  );
  return token;
}

export function deleteSession(db: Db, token: string) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function findSessionUsername(db: Db, token: string): string | null {
  const row = db
    .prepare(
      `SELECT u.username, s.expires_at FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
    )
    .get(hashToken(token)) as { username: string; expires_at: string } | undefined;
  if (!row) return null;
  if (Date.parse(row.expires_at) < Date.now()) return null;
  return row.username;
}

export function pruneExpiredSessions(db: Db) {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
}

export function readSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'strict', path: '/' });
}

export function consumeLoginAttempt(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= LOGIN_MAX_ATTEMPTS;
}

export function clearLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

export function requireAdmin(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = readSessionToken(req.headers.cookie);
    const username = token ? findSessionUsername(db, token) : null;
    if (!token || !username) {
      res.status(401).json({ error: 'يجب تسجيل الدخول للوصول إلى هذه الخدمة.' });
      return;
    }
    next();
  };
}
