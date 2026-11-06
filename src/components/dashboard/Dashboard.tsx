import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { DeviceTable } from '@/components/dashboard/DeviceTable';
import { ResponseChart } from '@/components/dashboard/ResponseChart';
import { AvailabilityChart } from '@/components/dashboard/AvailabilityChart';
import { EventLog } from '@/components/dashboard/EventLog';
import { DeviceFormModal } from '@/components/dashboard/DeviceFormModal';
import { DeleteDeviceModal } from '@/components/dashboard/DeleteDeviceModal';
import { SettingsModal } from '@/components/dashboard/SettingsModal';
import type { LinkStatus } from '@/hooks/useMonitorSocket';
import { api } from '@/lib/api';
import type { DashboardState, Device } from '@/types/monitor';

interface DashboardProps {
  snapshot: DashboardState;
  linkStatus: LinkStatus;
  username: string;
  onSnapshot: (state: DashboardState) => void;
  onLogout: () => void;
}

export function Dashboard({ snapshot, linkStatus, username, onSnapshot, onLogout }: DashboardProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Device | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Device | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleLogout() {
    await api.logout().catch(() => undefined);
    onLogout();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        mode={snapshot.mode}
        linkStatus={linkStatus}
        username={username}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {snapshot.mode === 'demo' && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 text-sm leading-relaxed text-amber-900 sm:px-6 lg:px-8">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            أنت في وضع المحاكاة التجريبي. النتائج مولدة عشوائيًا ولا تمثل حالة أجهزتك الحقيقية. لتفعيل المراقبة الحقيقية افتح الإعدادات واختر «مراقبة حقيقية».
          </p>
        </div>
      )}

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <SummaryCards devices={snapshot.devices} lastCycleAt={snapshot.lastCycleAt} />

        <DeviceTable
          devices={snapshot.devices}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={() => setEditing('new')}
          onEdit={setEditing}
          onDelete={setDeleting}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ResponseChart snapshot={snapshot} selectedId={selectedId} onSelect={setSelectedId} />
          <AvailabilityChart snapshot={snapshot} />
        </div>

        <EventLog snapshot={snapshot} />
      </main>

      {editing !== null && (
        <DeviceFormModal
          device={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={onSnapshot}
        />
      )}
      {deleting && (
        <DeleteDeviceModal device={deleting} onClose={() => setDeleting(null)} onDeleted={onSnapshot} />
      )}
      {settingsOpen && (
        <SettingsModal
          mode={snapshot.mode}
          intervalSeconds={snapshot.intervalSeconds}
          onClose={() => setSettingsOpen(false)}
          onSaved={onSnapshot}
        />
      )}
    </div>
  );
}
