import { useSignalR } from '../contexts/SignalRContext';

export default function LiveStatusBadge() {
  const { status, latency, stats } = useSignalR();

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-500 text-emerald-400 border-emerald-500/30';
      case 'connecting':
        return 'bg-amber-500 text-amber-400 border-amber-500/30';
      case 'disconnected':
      case 'error':
        return 'bg-rose-500 text-rose-400 border-rose-500/30';
    }
  };

  const getStatusDot = () => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-400 animate-ping';
      case 'connecting':
        return 'bg-amber-400 animate-pulse';
      case 'disconnected':
      case 'error':
        return 'bg-rose-500';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Live Badge */}
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${getStatusColor()} bg-opacity-10`}
        title={`SignalR Durumu: ${status} | Gecikme: ${latency ?? '-'}ms | Aktif Odalar: ${stats?.activeRoomsCount ?? 0}`}
      >
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusDot()}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${getStatusDot().split(' ')[0]}`} />
        </span>
        <span className="font-mono tracking-tight">
          {status === 'connected' ? (latency !== null ? `${latency}ms` : 'Canlı') : status === 'connecting' ? 'Bağlanıyor' : 'Koptu'}
        </span>
      </div>

      {/* Online Count Chip */}
      {status === 'connected' && stats && (
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-300">
          <span className="text-slate-400">👥</span>
          <span className="font-bold text-white">{stats.onlineUsersCount}</span>
          <span className="text-slate-400 text-[11px]">çevrimiçi</span>
        </div>
      )}
    </div>
  );
}
