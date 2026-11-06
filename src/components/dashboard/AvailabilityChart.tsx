import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AvailabilityItem, DashboardState } from '@/types/monitor';

const WINDOW_HOURS = 24;

function barColor(percent: number): string {
  if (percent >= 99) return 'bg-emerald-500';
  if (percent >= 90) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function AvailabilityChart({ snapshot }: { snapshot: DashboardState }) {
  const [items, setItems] = useState<AvailabilityItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .availability(WINDOW_HOURS)
      .then((response) => {
        if (!active) return;
        setItems(response.items);
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [snapshot]);

  return (
    <section className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div>
        <h2 className="text-lg font-bold text-slate-900">نسبة التوفر</h2>
        <p className="mt-0.5 text-sm text-slate-500">خلال آخر {WINDOW_HOURS} ساعة لكل جهاز</p>
      </div>

      <div className="mt-5 flex-1 space-y-4">
        {loadError && <p className="text-sm text-rose-600">تعذر تحميل نسب التوفر حاليًا.</p>}
        {!loadError && items === null && <p className="text-sm text-slate-500">جارٍ التحميل...</p>}
        {!loadError && items !== null && items.length === 0 && (
          <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
            أضف أجهزة لعرض نسب التوفر.
          </div>
        )}
        {items?.map((item) => (
          <div key={item.deviceId}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-slate-800">{item.name}</span>
              <span className="font-mono tabular-nums text-slate-600">
                {item.availabilityPercent === null ? 'لا توجد بيانات' : `${item.availabilityPercent}%`}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`توفر ${item.name}`} aria-valuenow={item.availabilityPercent ?? 0} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor(item.availabilityPercent ?? 0)}`}
                style={{ width: `${item.availabilityPercent ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
