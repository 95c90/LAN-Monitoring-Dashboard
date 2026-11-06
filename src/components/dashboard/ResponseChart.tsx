import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatClock } from '@/lib/format';
import type { DashboardState, HistoryPoint } from '@/types/monitor';

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };
const POINT_LIMIT = 60;

interface Point {
  x: number;
  y: number;
}

function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  return steps.map((step) => step * magnitude).find((candidate) => candidate >= value) ?? value;
}

export function ResponseChart({
  snapshot,
  selectedId,
  onSelect,
}: {
  snapshot: DashboardState;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const devices = snapshot.devices;
  const activeId = devices.some((device) => device.id === selectedId) ? selectedId : (devices[0]?.id ?? null);
  const [history, setHistory] = useState<{ deviceId: number; points: HistoryPoint[] } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (activeId === null) return;
    let active = true;
    api
      .history(activeId, POINT_LIMIT)
      .then((response) => {
        if (!active) return;
        setHistory({ deviceId: activeId, points: response.points });
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [activeId, snapshot]);

  const points = history && history.deviceId === activeId ? history.points : [];
  const online = points.filter((point) => point.online && point.rttMs !== null);
  const lastPoint = points[points.length - 1];
  const average = online.length
    ? Math.round((online.reduce((sum, point) => sum + (point.rttMs ?? 0), 0) / online.length) * 10) / 10
    : null;

  return (
    <section className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">زمن الاستجابة</h2>
          <p className="mt-0.5 text-sm text-slate-500">آخر {POINT_LIMIT} فحصًا للجهاز المحدد</p>
        </div>
        {devices.length > 0 && (
          <select
            aria-label="اختيار الجهاز للمخطط"
            value={activeId ?? ''}
            onChange={(event) => onSelect(Number(event.target.value))}
            className="max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="آخر قياس" value={lastPoint?.rttMs !== null && lastPoint?.rttMs !== undefined && lastPoint.online ? `${lastPoint.rttMs} ms` : '—'} />
        <Stat label="المتوسط" value={average === null ? '—' : `${average} ms`} />
        <Stat label="أعلى قيمة" value={online.length ? `${Math.max(...online.map((p) => p.rttMs ?? 0))} ms` : '—'} />
      </div>

      <div className="mt-5 flex-1">
        {devices.length === 0 ? (
          <ChartMessage text="أضف جهازًا لعرض مخطط زمن الاستجابة." />
        ) : loadError ? (
          <ChartMessage text="تعذر تحميل بيانات المخطط. ستتحدث تلقائيًا عند الفحص التالي." />
        ) : points.length === 0 ? (
          <ChartMessage text="لا توجد فحوصات مسجلة لهذا الجهاز بعد." />
        ) : (
          <LineChart points={points} />
        )}
      </div>
    </section>
  );
}

function LineChart({ points }: { points: HistoryPoint[] }) {
  const { segments, yMax, markers } = useMemo(() => {
    const innerWidth = WIDTH - PAD.left - PAD.right;
    const innerHeight = HEIGHT - PAD.top - PAD.bottom;
    const maxRtt = Math.max(0, ...points.map((point) => point.rttMs ?? 0));
    const top = niceCeil(Math.max(10, maxRtt * 1.15));
    const xFor = (index: number) =>
      PAD.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
    const yFor = (value: number) => PAD.top + innerHeight - (value / top) * innerHeight;

    const runs: Point[][] = [];
    let current: Point[] = [];
    const offlineMarkers: number[] = [];
    points.forEach((point, index) => {
      if (point.online && point.rttMs !== null) {
        current.push({ x: xFor(index), y: yFor(point.rttMs) });
      } else {
        offlineMarkers.push(xFor(index));
        if (current.length) runs.push(current);
        current = [];
      }
    });
    if (current.length) runs.push(current);

    return { segments: runs, yMax: top, markers: offlineMarkers };
  }, [points]);

  const baseline = HEIGHT - PAD.bottom;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(yMax * ratio));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-60 w-full" role="img" aria-label="مخطط زمن الاستجابة بالميلي ثانية">
      <defs>
        <linearGradient id="rtt-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0f766e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridValues.map((value) => {
        const y = baseline - ((baseline - PAD.top) * value) / yMax;
        return (
          <g key={value}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />
            <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="fill-slate-500 text-[11px]">
              {value}
            </text>
          </g>
        );
      })}

      {segments.map((run, index) => {
        const line = run.map((point, i) => `${i === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
        const area = `${line} L${run[run.length - 1].x.toFixed(1)},${baseline} L${run[0].x.toFixed(1)},${baseline} Z`;
        return (
          <g key={index}>
            <path d={area} fill="url(#rtt-fill)" />
            <path d={line} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {run.length <= 3 &&
              run.map((point, i) => <circle key={i} cx={point.x} cy={point.y} r="3" fill="#0f766e" />)}
          </g>
        );
      })}

      {markers.map((x, index) => (
        <circle key={`off-${index}`} cx={x} cy={baseline} r="3.5" fill="#e11d48" />
      ))}

      <text x={PAD.left} y={HEIGHT - 6} className="fill-slate-500 text-[11px]">
        {formatClock(points[0].checkedAt)}
      </text>
      <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-slate-500 text-[11px]">
        {formatClock(points[points.length - 1].checkedAt)}
      </text>
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function ChartMessage({ text }: { text: string }) {
  return (
    <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
