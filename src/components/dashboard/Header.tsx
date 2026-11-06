import { FlaskConical, LogOut, Network, Radio, Settings, Wifi, WifiOff } from 'lucide-react';
import type { LinkStatus } from '@/hooks/useMonitorSocket';
import type { MonitorMode } from '@/types/monitor';

interface HeaderProps {
  mode: MonitorMode;
  linkStatus: LinkStatus;
  username: string;
  onOpenSettings: () => void;
  onLogout: () => void;
}

const LINK_LABELS: Record<LinkStatus, string> = {
  connecting: 'جارٍ الاتصال',
  live: 'مزامنة مباشرة',
  reconnecting: 'إعادة الاتصال',
};

export function Header({ mode, linkStatus, username, onOpenSettings, onLogout }: HeaderProps) {
  const realMode = mode === 'real';
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900">مراقبة الشبكة المحلية</h1>
            <p className="text-xs text-slate-500">مرحبًا، {username}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
              realMode ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/25'
            }`}
          >
            {realMode ? <Radio className="h-3.5 w-3.5" /> : <FlaskConical className="h-3.5 w-3.5" />}
            {realMode ? 'مراقبة حقيقية (ping)' : 'وضع تجريبي - محاكاة'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              linkStatus === 'live' ? 'text-emerald-700' : 'text-amber-700'
            }`}
            role="status"
          >
            {linkStatus === 'live' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {LINK_LABELS[linkStatus]}
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <Settings className="h-4 w-4" />
            الإعدادات
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            خروج
          </button>
        </div>
      </div>
    </header>
  );
}
