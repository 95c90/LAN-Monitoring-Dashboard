import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { DashboardState, EventType, MonitorEvent } from '@/types/monitor';

const EVENT_LIMIT = 500;

type EventFilter = 'all' | 'connectivity' | 'admin';

const FILTERS: Array<{ value: EventFilter; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'connectivity', label: 'الاتصال والانقطاع' },
  { value: 'admin', label: 'إجراءات الإدارة' },
];

const CONNECTIVITY_TYPES: EventType[] = ['online', 'offline'];

const DOT_STYLES: Record<EventType, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-rose-500',
  device_added: 'bg-teal-600',
  device_updated: 'bg-sky-500',
  device_deleted: 'bg-slate-500',
  mode_changed: 'bg-amber-500',
  monitor_error: 'bg-amber-600',
};

export function EventLog({ snapshot }: { snapshot: DashboardState }) {
  const [events, setEvents] = useState<MonitorEvent[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<EventFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    api
      .events(EVENT_LIMIT)
      .then((response) => {
        if (!active) return;
        setEvents(response.events);
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [snapshot]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (events ?? []).filter((event) => {
      if (filter === 'connectivity' && !CONNECTIVITY_TYPES.includes(event.type)) return false;
      if (filter === 'admin' && CONNECTIVITY_TYPES.includes(event.type)) return false;
      if (!term) return true;
      return event.deviceName.toLowerCase().includes(term) || event.ipAddress.includes(term);
    });
  }, [events, filter, query]);

  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">سجل الأحداث</h2>
          <p className="mt-0.5 text-sm text-slate-500">كل تغيير في حالة الأجهزة وإجراءات الإدارة</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث باسم الجهاز أو IP"
            aria-label="بحث في السجل"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
          />
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="تصفية السجل">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  filter === option.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <p className="px-5 py-10 text-center text-sm text-rose-600">تعذر تحميل سجل الأحداث. سيُعاد المحاولة مع التحديث التالي.</p>
      ) : events === null ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">جارٍ تحميل السجل...</p>
      ) : visible.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">لا توجد أحداث مطابقة.</p>
      ) : (
        <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
          {visible.map((event) => (
            <li key={event.id} className="flex items-start gap-4 px-5 py-3.5 transition hover:bg-slate-50">
              <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${DOT_STYLES[event.type]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-900">
                  <span className="font-semibold">{event.deviceName}</span>
                  {event.ipAddress !== '-' && (
                    <span dir="ltr" className="ms-2 font-mono text-xs text-slate-500">{event.ipAddress}</span>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">{event.message}</p>
              </div>
              <time className="shrink-0 font-mono text-xs tabular-nums text-slate-500" dateTime={event.createdAt}>
                {formatDateTime(event.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
