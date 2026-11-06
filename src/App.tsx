import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthScreen } from '@/components/ui/AuthScreen';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useMonitorSocket } from '@/hooks/useMonitorSocket';
import { api, UNAUTHORIZED_EVENT } from '@/lib/api';
import type { AuthStatus, DashboardState } from '@/types/monitor';

function Splash({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600">
      <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardState | null>(null);
  const [statusError, setStatusError] = useState(false);

  const refreshAuth = useCallback(() => {
    setStatusError(false);
    api
      .authStatus()
      .then(setAuth)
      .catch(() => setStatusError(true));
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setSnapshot(null);
      setAuth((previous) => (previous ? { ...previous, authenticated: false, username: null } : previous));
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const authenticated = auth?.authenticated === true;
  const linkStatus = useMonitorSocket(authenticated, setSnapshot);

  if (statusError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <p className="text-slate-700">تعذر الاتصال بخادم المراقبة. تحقق من أنه يعمل ثم أعد المحاولة.</p>
        <button type="button" onClick={refreshAuth} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!auth) return <Splash message="جارٍ التحميل..." />;

  if (!authenticated) {
    return (
      <AuthScreen
        mode={auth.setupRequired ? 'setup' : 'login'}
        onAuthenticated={() => refreshAuth()}
      />
    );
  }

  if (!snapshot || !auth.username) return <Splash message="جارٍ الاتصال بلوحة المراقبة..." />;

  return (
    <Dashboard
      snapshot={snapshot}
      linkStatus={linkStatus}
      username={auth.username}
      onSnapshot={setSnapshot}
      onLogout={() => {
        setSnapshot(null);
        refreshAuth();
      }}
    />
  );
}
