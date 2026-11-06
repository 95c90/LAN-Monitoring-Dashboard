import { useState, type FormEvent } from 'react';
import { Loader2, Network } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface AuthScreenProps {
  mode: 'setup' | 'login';
  onAuthenticated: (username: string) => void;
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15';

export function AuthScreen({ mode, onAuthenticated }: AuthScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isSetup = mode === 'setup';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSetup && password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = isSetup ? await api.setup(username.trim(), password) : await api.login(username.trim(), password);
      onAuthenticated(result.username);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'تعذر الاتصال بالخادم. تحقق من تشغيله.');
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/20">
            <Network className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">مراقبة الشبكة المحلية</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {isSetup
              ? 'أنشئ حساب المدير الأول للوحة. هذه الخطوة تتم مرة واحدة فقط.'
              : 'سجّل الدخول بحساب المدير للوصول إلى لوحة المراقبة.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8" noValidate>
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-700">اسم المستخدم</label>
            <input id="username" dir="ltr" autoComplete="username" className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} disabled={submitting} placeholder="admin" autoFocus />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">كلمة المرور</label>
            <input id="password" type="password" dir="ltr" autoComplete={isSetup ? 'new-password' : 'current-password'} className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
          </div>
          {isSetup && (
            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700">تأكيد كلمة المرور</label>
              <input id="confirm" type="password" dir="ltr" autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={submitting} />
              <p className="mt-1.5 text-xs text-slate-500">8 أحرف على الأقل.</p>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-600/20">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSetup ? 'إنشاء حساب المدير' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </main>
  );
}
