import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineStatusPill() {
  const isOnline = useOnlineStatus();

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}
