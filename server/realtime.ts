import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { findSessionUsername, readSessionToken } from './auth';
import type { Db } from './db';
import { buildDashboardState } from './snapshot';
import type { ServerMessage } from '../src/types/monitor';

const WS_PATH = '/ws';
const HEARTBEAT_MS = 30_000;

export interface RealtimeHub {
  publish(): void;
}

export function createRealtimeHub(server: HttpServer, db: Db): RealtimeHub {
  const wss = new WebSocketServer({ noServer: true });
  const alive = new WeakMap<WebSocket, boolean>();

  function send(client: WebSocket, message: ServerMessage) {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
  }

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== WS_PATH) return;

    const origin = req.headers.origin;
    const originAllowed = !origin || new URL(origin).host === req.headers.host;
    const username = findSessionUsername(db, readSessionToken(req.headers.cookie) ?? '');
    if (!originAllowed || !username) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (client) => {
      wss.emit('connection', client, req);
    });
  });

  wss.on('connection', (client: WebSocket) => {
    alive.set(client, true);
    client.on('pong', () => alive.set(client, true));
    client.on('error', () => client.terminate());
    send(client, { type: 'snapshot', data: buildDashboardState(db) });
  });

  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (alive.get(client) === false) {
        client.terminate();
        continue;
      }
      alive.set(client, false);
      client.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  return {
    publish() {
      if (wss.clients.size === 0) return;
      const message: ServerMessage = { type: 'snapshot', data: buildDashboardState(db) };
      const payload = JSON.stringify(message);
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
      }
    },
  };
}
