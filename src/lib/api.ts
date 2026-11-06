import type {
  AuthStatus,
  AvailabilityItem,
  DashboardState,
  HistoryPoint,
  MonitorEvent,
  MonitorMode,
} from '@/types/monitor';

export const UNAUTHORIZED_EVENT = 'lanm:unauthorized';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface DeviceInput {
  name: string;
  ipAddress: string;
}

interface SettingsPatch {
  mode?: MonitorMode;
  intervalSeconds?: number;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${url}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'حدث خطأ غير متوقع. حاول مرة أخرى.';
    if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const api = {
  authStatus: () => request<AuthStatus>('GET', '/auth/status'),
  setup: (username: string, password: string) =>
    request<{ username: string }>('POST', '/auth/setup', { username, password }),
  login: (username: string, password: string) =>
    request<{ username: string }>('POST', '/auth/login', { username, password }),
  logout: () => request<void>('POST', '/auth/logout'),
  createDevice: (input: DeviceInput) => request<DashboardState>('POST', '/devices', input),
  updateDevice: (id: number, input: DeviceInput) =>
    request<DashboardState>('PUT', `/devices/${id}`, input),
  deleteDevice: (id: number) => request<DashboardState>('DELETE', `/devices/${id}`),
  history: (deviceId: number, limit: number) =>
    request<{ points: HistoryPoint[] }>('GET', `/devices/${deviceId}/history?limit=${limit}`),
  availability: (hours: number) =>
    request<{ items: AvailabilityItem[] }>('GET', `/stats/availability?hours=${hours}`),
  events: (limit: number) => request<{ events: MonitorEvent[] }>('GET', `/events?limit=${limit}`),
  updateSettings: (patch: SettingsPatch) =>
    request<DashboardState>('PUT', '/settings', patch),
};
