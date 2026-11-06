import { useEffect, useRef, useState } from 'react';
import { api, UNAUTHORIZED_EVENT } from '@/lib/api';
import type { DashboardState, ServerMessage } from '@/types/monitor';

export type LinkStatus = 'connecting' | 'live' | 'reconnecting';

const MAX_RETRY_DELAY_MS = 15_000;

function parseSnapshot(raw: unknown): DashboardState | null {
  if (typeof raw !== 'string') return null;
  try {
    const message = JSON.parse(raw) as ServerMessage;
    return message.type === 'snapshot' ? message.data : null;
  } catch {
    return null;
  }
}

export function useMonitorSocket(
  enabled: boolean,
  onSnapshot: (state: DashboardState) => void
): LinkStatus {
  const [status, setStatus] = useState<LinkStatus>('connecting');
  const snapshotRef = useRef(onSnapshot);

  useEffect(() => {
    snapshotRef.current = onSnapshot;
  });

  useEffect(() => {
    if (!enabled) return;

    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let attempt = 0;
    let disposed = false;

    const scheduleReconnect = () => {
      const delay = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempt);
      attempt += 1;
      retryTimer = window.setTimeout(connect, delay);
    };

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socket.onopen = () => {
        attempt = 0;
        setStatus('live');
      };
      socket.onmessage = (event: MessageEvent) => {
        const state = parseSnapshot(event.data);
        if (state) snapshotRef.current(state);
      };
      socket.onclose = () => {
        if (disposed) return;
        setStatus('reconnecting');
        api
          .authStatus()
          .then((auth) => {
            if (disposed) return;
            if (!auth.authenticated) {
              window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
              return;
            }
            scheduleReconnect();
          })
          .catch(() => {
            if (!disposed) scheduleReconnect();
          });
      };
    };

    connect();

    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [enabled]);

  return status;
}
