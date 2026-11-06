import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api, ApiError } from '@/lib/api';
import type { DashboardState, Device } from '@/types/monitor';

interface DeleteDeviceModalProps {
  device: Device;
  onClose: () => void;
  onDeleted: (state: DashboardState) => void;
}

export function DeleteDeviceModal({ device, onClose, onDeleted }: DeleteDeviceModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      onDeleted(await api.deleteDevice(device.id));
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError ? requestError.message : 'تعذر حذف الجهاز. حاول مرة أخرى.'
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="حذف الجهاز"
      description="سيتم حذف الجهاز وسجل فحوصاته من قائمة المراقبة. سيبقى سجل الأحداث محفوظًا."
      onClose={onClose}
    >
      <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="font-semibold text-slate-900">{device.name}</p>
        <p dir="ltr" className="mt-1 text-start font-mono text-sm text-slate-600">
          {device.ipAddress}
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-600/20">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          حذف نهائي
        </button>
      </div>
    </Modal>
  );
}
