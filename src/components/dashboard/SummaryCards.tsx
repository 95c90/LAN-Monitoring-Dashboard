import { CheckCircle2, Gauge, Server, XCircle } from 'lucide-react';
import { useNow } from '@/hooks/useNow';
import { formatRelative } from '@/lib/format';
import type { Device } from '@/types/monitor';
import type { ReactNode } from 'react';

interface SummaryCardsProps {
  devices: Device[];
  lastCycleAt: string | null;
}

export function SummaryCards({ devices, lastCycleAt }: SummaryCardsProps) {
  const now = useNow();
  const online = devices.filter((device) => device.status === 'online');
  const offline = devices.filter((device) => device.status === 'offline');
  const rtts = online.map((device) => device.lastRttMs).filter((value): value is number => value !== null);
  const average = rtts.length ? Math.round((rtts.reduce((sum, value) => sum + value, 0) / rtts.length) * 10) / 10 : null;

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Card icon={<Server className="h-5 w-5" />} tone="slate" label="إجمالي الأجهزة" value={String(devices.length)} />
      <Card icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" label="متصلة الآن" value={String(online.length)} />
      <Card icon={<XCircle className="h-5 w-5" />} tone="rose" label="غير متصلة" value={String(offline.length)} />
      <Card
        icon={<Gauge className="h-5 w-5" />}
        tone="teal"
        label="متوسط زمن الاستجابة"
        value={average === null ? '—' : `${average} ms`}
        hint={lastCycleAt ? `آخر فحص ${formatRelative(lastCycleAt, now)}` : 'لم يبدأ الفحص بعد'}
      />
    </div>
  );
}

const TONES = {
  slate: 'bg-slate-100 text-slate-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  rose: 'bg-rose-50 text-rose-700',
  teal: 'bg-teal-50 text-teal-700',
} as const;

function Card({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  tone: keyof typeof TONES;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-xl p-2 ${TONES[tone]}`}>{icon}</span>
      </div>
      <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
