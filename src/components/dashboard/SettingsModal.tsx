import { useState, type FormEvent } from 'react';
import { FlaskConical, Loader2, Radio } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api, ApiError } from '@/lib/api';
import type { DashboardState, MonitorMode } from '@/types/monitor';

interface SettingsModalProps {
  mode: MonitorMode;
  intervalSeconds: number;
  onClose: () => void;
  onSaved: (state: DashboardState) => void;
}

const INTERVAL_OPTIONS = [5, 10, 15, 30, 60, 120, 300];

const MODE_OPTIONS: Array<{
  value: MonitorMode;
  title: string;
  description: string;
  icon: typeof Radio;
}> = [
  {
    value: 'real',
    title: 'مراقبة حقيقية',
    description: 'يرسل الخادم طلبات ping فعلية إلى عناوين الأجهزة المسجلة ويعرض النتائج الحقيقية.',
    icon: Radio,
  },
  {
    value: 'demo',
    title: 'وضع تجريبي',
    description: 'نتائج محاكاة عشوائية لعرض الواجهة فقط، ولا تمثل حالة شبكتك.',
    icon: FlaskConical,
  },
];

export function SettingsModal({ mode, intervalSeconds, onClose, onSaved }: SettingsModalProps) {
  const [selectedMode, setSelectedMode] = useState<MonitorMode>(mode);
  const [seconds, setSeconds] = useState(intervalSeconds);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onSaved(await api.updateSettings({ mode: selectedMode, intervalSeconds: seconds }));
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError ? requestError.message : 'تعذر حفظ الإعدادات. حاول مرة أخرى.'
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal title="إعدادات المراقبة" description="اختر طريقة الفحص وفترة التحديث." onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium text-slate-700">وضع المراقبة</legend>
          {MODE_OPTIONS.map((option) => {
            const active = selectedMode === option.value;
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition ${
                  active
                    ? 'border-teal-600 bg-teal-50/60 ring-4 ring-teal-600/10'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="monitor-mode"
                  value={option.value}
                  checked={active}
                  onChange={() => setSelectedMode(option.value)}
                  className="mt-1 h-4 w-4 accent-teal-700"
                />
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-teal-700' : 'text-slate-500'}`} />
                <span>
                  <span className="block font-semibold text-slate-900">{option.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600">{option.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <div>
          <label htmlFor="check-interval" className="mb-2 block text-sm font-medium text-slate-700">
            فترة الفحص
          </label>
          <select
            id="check-interval"
            value={seconds}
            onChange={(event) => setSeconds(Number(event.target.value))}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                كل {option} ثانية
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-600/20">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
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
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ الإعدادات
          </button>
        </div>
      </form>
    </Modal>
  );
}
