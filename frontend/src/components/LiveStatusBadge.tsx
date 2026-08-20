import { useSignalR } from '../contexts/SignalRContext';

export default function LiveStatusBadge() {
  const { status, latency, stats } = useSignalR();

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          dotColor: 'bg-emerald-500',
          pingColor: 'bg-emerald-400',
          textColor: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10 border-emerald-500/30',
          label: 'Canlı Soket',
        };
      case 'connecting':
        return {
          dotColor: 'bg-amber-500',
          pingColor: 'bg-amber-400',
          textColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10 border-amber-500/30',
          label: 'Bağlanıyor...',
        };
      case 'reconnecting':
        return {
          dotColor: 'bg-amber-500',
          pingColor: 'bg-amber-400',
          textColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10 border-amber-500/30',
          label: 'Yeniden Bağlanıyor...',
        };
      case 'disconnected':
      default:
        return {
          dotColor: 'bg-rose-500',
          pingColor: 'bg-rose-400',
          textColor: 'text-rose-400',
          bgColor: 'bg-rose-500/10 border-rose-500/30',
          label: 'Bağlantı Yok',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${config.bgColor} transition-all duration-300`}>
      <span className="relative flex h-2 w-2">
        {status === 'connected' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pingColor} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
      </span>
      <span className={config.textColor}>{config.label}</span>
      {status === 'connected' && latency !== null && (
        <span className="text-[var(--color-text-muted)] font-mono pl-1 border-l border-white/10">
          {latency} ms
        </span>
      )}
      {status === 'connected' && stats && (
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)]">
          {stats.isRedisActive ? 'Redis' : 'Memory'}
        </span>
      )}
    </div>
  );
}
