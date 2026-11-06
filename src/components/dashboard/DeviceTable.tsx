import { useMemo, useState, type ReactNode } from 'react';
import { Activity, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useNow } from '@/hooks/useNow';
import { formatRelative, formatRtt } from '@/lib/format';
import type { Device, DeviceStatus } from '@/types/monitor';

interface DeviceTableProps {
  devices: Device[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
}

type StatusFilter = 'all' | DeviceStatus;

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'online', label: 'متصل' },
  { value: 'offline', label: 'غير متصل' },
  { value: 'unknown', label: 'بانتظار الفحص' },
];

export function DeviceTable({ devices, selectedId, onSelect, onAdd, onEdit, onDelete }: DeviceTableProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const now = useNow();

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { all: devices.length, online: 0, offline: 0, unknown: 0 };
    for (const device of devices) result[device.status] += 1;
    return result;
  }, [devices]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return devices.filter((device) => {
      if (filter !== 'all' && device.status !== filter) return false;
      if (!term) return true;
      return device.name.toLowerCase().includes(term) || device.ipAddress.includes(term);
    });
  }, [devices, filter, query]);

  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">الأجهزة المراقَبة</h2>
          <p className="mt-0.5 text-sm text-slate-500">انقر على جهاز لعرض مخطط استجابته</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="بحث بالاسم أو عنوان IP"
              aria-label="بحث في الأجهزة"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 ps-10 pe-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 sm:w-64"
            />
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/30"
          >
            <Plus className="h-4 w-4" />
            إضافة جهاز
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3" role="tablist" aria-label="تصفية حسب الحالة">
        {FILTERS.map((option) => {
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option.label}
              <span className={`ms-2 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{counts[option.value]}</span>
            </button>
          );
        })}
      </div>

      {devices.length === 0 ? (
        <EmptyState
          title="لا توجد أجهزة في هذا الوضع"
          description="أضف عناوين IP الخاصة بالأجهزة التي تريد مراقبتها داخل شبكتك المحلية."
          action={
            <button type="button" onClick={onAdd} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800">
              <Plus className="h-4 w-4" />
              إضافة أول جهاز
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState title="لا توجد نتائج مطابقة" description="جرّب تغيير كلمة البحث أو الفلتر المحدد." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3 text-start">الجهاز</th>
                <th scope="col" className="px-5 py-3 text-start">عنوان IP</th>
                <th scope="col" className="px-5 py-3 text-start">الحالة</th>
                <th scope="col" className="px-5 py-3 text-start">زمن الاستجابة</th>
                <th scope="col" className="px-5 py-3 text-start">آخر فحص</th>
                <th scope="col" className="px-5 py-3 text-end">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((device) => {
                const selected = device.id === selectedId;
                return (
                  <tr
                    key={device.id}
                    onClick={() => onSelect(device.id)}
                    className={`cursor-pointer transition hover:bg-slate-50 ${selected ? 'bg-teal-50/60' : ''}`}
                  >
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{device.name}</td>
                    <td dir="ltr" className="px-5 py-3.5 text-start font-mono text-slate-600">{device.ipAddress}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={device.status} /></td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-slate-700">
                      {device.status === 'online' ? formatRtt(device.lastRttMs) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{formatRelative(device.lastCheckedAt, now)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelect(device.id)}
                          aria-label={`عرض مخطط ${device.name}`}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700"
                        >
                          <Activity className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(device)}
                          aria-label={`تعديل ${device.name}`}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(device)}
                          aria-label={`حذف ${device.name}`}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
        <Search className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      {action}
    </div>
  );
}
