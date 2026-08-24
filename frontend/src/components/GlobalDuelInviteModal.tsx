import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignalR } from '../contexts/SignalRContext';

interface DuelInvitePayload {
  inviteId: string;
  fromUserId: string;
  fromUsername: string;
  fromLevel: number;
  category: string;
  roomCode: string;
  requesterConnectionId: string;
}

export default function GlobalDuelInviteModal() {
  const { connection, status } = useSignalR();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<DuelInvitePayload | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!connection || status !== 'connected') return;

    const handleInviteReceived = (data: DuelInvitePayload) => {
      setInvite(data);
    };

    const handleInviteAccepted = (data: { roomCode: string; opponentUsername: string }) => {
      showToast(`⚔️ ${data.opponentUsername} daveti kabul etti! Odaya giriliyor...`);
      setTimeout(() => {
        navigate(`/lobby/${data.roomCode}`);
      }, 1000);
    };

    const handleInviteDeclined = (data: { targetUsername: string }) => {
      showToast(`❌ ${data.targetUsername} düello davetini reddetti.`);
    };

    const handleInviteError = (msg: string) => {
      showToast(`⚠️ ${msg}`);
    };

    connection.on('DuelInviteReceived', handleInviteReceived);
    connection.on('DuelInviteAccepted', handleInviteAccepted);
    connection.on('DuelInviteDeclined', handleInviteDeclined);
    connection.on('DuelInviteError', handleInviteError);

    return () => {
      connection.off('DuelInviteReceived', handleInviteReceived);
      connection.off('DuelInviteAccepted', handleInviteAccepted);
      connection.off('DuelInviteDeclined', handleInviteDeclined);
      connection.off('DuelInviteError', handleInviteError);
    };
  }, [connection, status, navigate]);

  const handleRespond = (accept: boolean) => {
    if (!invite || !connection) return;

    connection.invoke(
      'RespondDuelInvite',
      invite.inviteId,
      accept,
      invite.roomCode,
      invite.requesterConnectionId
    ).catch(console.error);

    if (accept) {
      navigate(`/lobby/${invite.roomCode}`);
    }

    setInvite(null);
  };

  return (
    <>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-violet-600 to-cyan-500 border border-white/20 text-white px-4 py-2 rounded-2xl shadow-2xl text-xs font-black animate-bounce whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* Duel Invitation Modal */}
      {invite && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#141738] border-2 border-amber-400 rounded-3xl p-6 text-center shadow-2xl space-y-4 animate-subtle-pulse">
            <div className="text-5xl animate-bounce">⚔️</div>

            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
                CANLI DÜELLO DAVETİ
              </div>
              <h3 className="text-xl font-black text-white">
                {invite.fromUsername}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Seni <strong className="text-cyan-400">{invite.category}</strong> 1v1 Sınav Düellosuna davet ediyor!
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => handleRespond(false)}
                className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-slate-300 font-bold text-xs uppercase cursor-pointer transition"
              >
                Reddet
              </button>

              <button
                onClick={() => handleRespond(true)}
                className="flex-1 py-3.5 rounded-2xl btn-game-gold font-black text-xs uppercase text-slate-950 cursor-pointer shadow-xl transition active:scale-95"
              >
                Kabul Et ⚔️
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
