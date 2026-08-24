import { useState, useEffect } from 'react';
import { useSignalR } from '../contexts/SignalRContext';

interface EmotePickerProps {
  roomCode: string;
}

interface ActiveEmoteBubble {
  id: string;
  username: string;
  icon: string;
}

export default function EmotePicker({ roomCode }: EmotePickerProps) {
  const { connection, status } = useSignalR();
  const [isOpen, setIsOpen] = useState(false);
  const [activeBubbles, setActiveBubbles] = useState<ActiveEmoteBubble[]>([]);

  const emotes = [
    { key: 'fire', icon: '🔥', label: 'Alev' },
    { key: 'shock', icon: '🤯', label: 'Şok' },
    { key: 'crown', icon: '👑', label: 'Kral' },
    { key: 'skull', icon: '💀', label: 'Ölüm' },
    { key: 'bullseye', icon: '🎯', label: 'Tam İsabet' },
    { key: 'cool', icon: '😎', label: 'Havalı' },
    { key: 'crying', icon: '😭', label: 'Ağlama' },
    { key: 'celebrate', icon: '🎉', label: 'Kutlama' },
  ];

  useEffect(() => {
    if (!connection || status !== 'connected') return;

    const handleEmoteReceived = (data: { userId: string; username: string; icon: string }) => {
      const bubble: ActiveEmoteBubble = {
        id: Math.random().toString(36),
        username: data.username,
        icon: data.icon
      };

      setActiveBubbles((prev) => [...prev, bubble]);

      setTimeout(() => {
        setActiveBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
      }, 3000);
    };

    connection.on('EmoteReceived', handleEmoteReceived);
    return () => {
      connection.off('EmoteReceived', handleEmoteReceived);
    };
  }, [connection, status]);

  const handleSendEmote = (key: string) => {
    if (!connection || !roomCode) return;
    connection.invoke('SendEmote', roomCode, key).catch(console.error);
    setIsOpen(false);
  };

  return (
    <>
      {/* FLOATING ANIMATED EMOTE BUBBLES */}
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
        {activeBubbles.map((bubble) => (
          <div
            key={bubble.id}
            className="absolute bottom-24 flex flex-col items-center animate-bounce-subtle transition-all"
            style={{
              animation: 'floatUp 2.8s ease-out forwards',
            }}
          >
            <div className="bg-[#141738]/90 border-2 border-violet-400/60 rounded-3xl p-3 shadow-2xl flex flex-col items-center gap-1 backdrop-blur-md">
              <span className="text-5xl animate-spin-slow">{bubble.icon}</span>
              <span className="text-[10px] font-black text-violet-300 font-mono">
                {bubble.username}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* EMOTE POPOVER */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-40 bg-[#141738] border-2 border-violet-500 rounded-3xl p-3 shadow-2xl animate-fadeIn">
          <div className="grid grid-cols-4 gap-2">
            {emotes.map((e) => (
              <button
                key={e.key}
                onClick={() => handleSendEmote(e.key)}
                className="w-11 h-11 bg-white/5 hover:bg-violet-600/30 border border-white/10 rounded-2xl flex items-center justify-center text-2xl transition active:scale-90 cursor-pointer"
                title={e.label}
              >
                {e.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FLOATING TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full btn-game-gold shadow-2xl flex items-center justify-center text-xl cursor-pointer active:scale-90 transition-transform"
        title="Canlı Emoji Gönder"
      >
        💬
      </button>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { transform: translateY(-40px) scale(1.2); opacity: 1; }
          80% { transform: translateY(-160px) scale(1); opacity: 1; }
          100% { transform: translateY(-240px) scale(0.8); opacity: 0; }
        }
      `}</style>
    </>
  );
}
