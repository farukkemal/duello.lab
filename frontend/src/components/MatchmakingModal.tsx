import { useState, useEffect } from 'react';
import { useSignalR } from '../contexts/SignalRContext';
import { type GameMode, type MatchFoundData, type QueueStatusData } from '../api/rooms';

interface MatchmakingModalProps {
  mode: GameMode;
  category: string;
  onCancel: () => void;
  onMatchFound: (roomCode: string) => void;
}

export default function MatchmakingModal({ mode, category, onCancel, onMatchFound }: MatchmakingModalProps) {
  const { connection, status } = useSignalR();
  const [elapsed, setElapsed] = useState(0);
  const [inQueueCount, setInQueueCount] = useState(1);
  const [matchFoundData, setMatchFoundData] = useState<MatchFoundData | null>(null);

  const modeName = mode === 1
    ? 'Dereceli 1v1 Düello'
    : mode === 3
      ? 'Ani Ölüm (Sudden Death)'
      : mode === 4
        ? '2v2 Takım Savaşı'
        : 'Hızlı Eşleşme';

  const modeIcon = mode === 1 ? '⚡' : mode === 3 ? '⏱️' : mode === 4 ? '👑' : '🎮';

  useEffect(() => {
    if (!connection || status !== 'connected') return;

    // Join queue on server
    connection.invoke('JoinMatchmakingQueue', mode, category).catch(console.error);

    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    const handleQueueStatus = (data: QueueStatusData) => {
      setInQueueCount(data.inQueueCount);
    };

    const handleMatchFound = (data: MatchFoundData) => {
      setMatchFoundData(data);
      setTimeout(() => {
        onMatchFound(data.roomCode);
      }, 1500);
    };

    connection.on('QueueStatusUpdated', handleQueueStatus);
    connection.on('MatchFound', handleMatchFound);

    return () => {
      clearInterval(timer);
      connection.off('QueueStatusUpdated', handleQueueStatus);
      connection.off('MatchFound', handleMatchFound);
    };
  }, [connection, status, mode, category, onMatchFound]);

  const handleCancel = () => {
    if (connection && connection.state === 'Connected') {
      connection.invoke('LeaveMatchmakingQueue').catch(() => {});
    }
    onCancel();
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#131631] border-2 border-violet-500 rounded-3xl p-6 text-center shadow-2xl space-y-5 relative overflow-hidden">
        
        {/* Background Radar Waves */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-64 h-64 rounded-full border border-violet-400 animate-ping" />
        </div>

        {matchFoundData ? (
          /* MATCH FOUND SCREEN */
          <div className="space-y-4 animate-fadeIn">
            <div className="text-5xl animate-bounce">🎯</div>
            <div>
              <h3 className="text-2xl font-black text-amber-300 uppercase tracking-tight">
                RAKİP BULUNDU!
              </h3>
              <p className="text-xs text-slate-300 mt-1">Savaş arenasına aktarılıyorsunuz...</p>
            </div>

            <div className="bg-[#1b2046] border border-white/10 rounded-2xl p-3.5 flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 p-[1.5px]">
                <div className="w-full h-full bg-[#0d0f22] rounded-[10px] flex items-center justify-center font-black text-white text-sm">
                  {matchFoundData.opponentUsername.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="text-left">
                <div className="text-sm font-black text-white">{matchFoundData.opponentUsername}</div>
                <div className="text-[10px] text-amber-300 font-mono">Seviye {matchFoundData.opponentLevel}</div>
              </div>
            </div>
          </div>
        ) : (
          /* SEARCHING QUEUE SCREEN */
          <div className="space-y-5">
            {/* Animated Radar Pulse */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-violet-500/40 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-cyan-400/50 animate-pulse" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-400 p-0.5 shadow-xl flex items-center justify-center">
                <div className="w-full h-full bg-[#0d0f22] rounded-full flex items-center justify-center text-3xl">
                  {modeIcon}
                </div>
              </div>
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[10px] font-black uppercase tracking-wider mb-2">
                {category} • {modeName}
              </div>
              <h3 className="text-lg font-black text-white">Rakip Aranıyor...</h3>
              <div className="text-2xl font-mono font-black text-cyan-400 mt-1">
                ⏱️ {formatTimer(elapsed)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                Kuyrukta: {inQueueCount} Oyuncu
              </div>
            </div>

            <button
              onClick={handleCancel}
              className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 font-bold text-xs uppercase cursor-pointer active:scale-95 transition-all"
            >
              Aramayı İptal Et ✕
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
