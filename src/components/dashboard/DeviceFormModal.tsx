import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api, ApiError } from '@/lib/api';
import type { DashboardState, Device } from '@/types/monitor';

interface DeviceFormModalProps {
  device: Device | null;
  onClose: () => void;
  onSaved: (state: DashboardState) => void;
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 disabled:bg-slate-100';

export function DeviceFormModal({ device, onClose, onSaved }: DeviceFormModalProps) {
  const [name, setName] = useState(device?.name ?? '');
  const [ipAddress, setIpAddress] = useState(device?.ipAddress ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = device !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { name: name.trim(), ipAddress: ipAddress.trim() };
    if (!input.name) {
      setError('أدخل اسمًا يساعدك على تمييز الجهاز.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const state = isEdit
        ? await api.updateDevice(device.id, input)
        : await api.createDevice(input);
      onSaved(state);
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError ? requestError.message : 'تعذر حفظ الجهاز. تحقق من الاتصال.'
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'تعديل الجهاز' : 'إضافة جهاز جديد'}
      description="يمكن إضافة الأجهزة ذات عناوين IP الخاصة بالشبكة المحلية فقط (10.x و172.16-31.x و192.168.x و127.x)."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="device-name" className="mb-1.5 block text-sm font-medium text-slate-700">
            اسم الجهاز
          </label>
          <input
            id="device-name"
            className={inputClass}
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            placeholder="مثال: طابعة المكتب"
            autoFocus
            disabled={submitting}
          />
        </div>

        <div>
          <label htmlFor="device-ip" className="mb-1.5 block text-sm font-medium text-slate-700">
            عنوان IP
          </label>
          <input
            id="device-ip"
            dir="ltr"
            inputMode="decimal"
            className={`${inputClass} font-mono`}
            value={ipAddress}
            maxLength={15}
            onChange={(event) => setIpAddress(event.target.value)}
            placeholder="192.168.1.10"
            disabled={submitting}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-600/20">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'حفظ التعديلات' : 'إضافة الجهاز'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
