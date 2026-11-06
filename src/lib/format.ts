const LATIN_TIME = new Intl.DateTimeFormat('ar-u-nu-latn', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const LATIN_DATE_TIME = new Intl.DateTimeFormat('ar-u-nu-latn', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function formatClock(iso: string | null): string {
  return iso ? LATIN_TIME.format(new Date(iso)) : '—';
}

export function formatDateTime(iso: string | null): string {
  return iso ? LATIN_DATE_TIME.format(new Date(iso)) : '—';
}

export function formatRtt(ms: number | null): string {
  return ms === null ? '—' : `${ms} ms`;
}

export function formatRelative(iso: string | null, now: number): string {
  if (!iso) return 'لم يتم الفحص بعد';
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 5) return 'الآن';
  if (seconds < 60) return `منذ ${seconds} ثانية`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  return `منذ ${hours} ساعة`;
}
