import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { claimCoins } from '../api/rooms';
import { triggerLevelUpConfetti } from '../utils/confetti';
import { isAudioMuted, toggleAudioMute, playCoinSound } from '../utils/audio';
import FriendsDrawer from './FriendsDrawer';

interface MobileTopHUDProps {
  onOpenProfile?: () => void;
}

export default function MobileTopHUD({ onOpenProfile }: MobileTopHUDProps) {
  const { user, refreshUser } = useAuth();
  const { status, latency } = useSignalR();
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);
  const [coinPopup, setCoinPopup] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [muted, setMuted] = useState(isAudioMuted());

  if (!user) return null;

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (claiming) return;
    setClaiming(true);
    try {
      await claimCoins();
      await refreshUser();
      playCoinSound();
      triggerLevelUpConfetti();
      setCoinPopup(true);
      setTimeout(() => setCoinPopup(false), 2200);
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = toggleAudioMute();
    setMuted(newMuted);
  };

  const xpCurrent = user.xp % 1000;
  const xpPercent = Math.min(100, Math.round((xpCurrent / 1000) * 100));

  const handleProfileClick = () => {
    if (onOpenProfile) {
      onOpenProfile();
    } else {
      navigate('/dashboard?tab=profil', { state: { tab: 'profil' } });
    }
  };

  return (
    <>
      <header className="shrink-0 z-40 bg-[#0c0e22]/95 backdrop-blur-xl border-b border-white/10 px-3 py-2.5 shadow-lg w-full">
        <div className="flex items-center justify-between gap-1.5">
          
          {/* Left: Player Profile & Level Card */}
          <div
            onClick={handleProfileClick}
            className="flex items-center gap-1.5 bg-[#171b38] border border-white/15 px-2 py-1.5 rounded-2xl cursor-pointer active:scale-95 transition-transform"
          >
            <div className="relative">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1.5px] shadow">
                <div className="w-full h-full bg-[#0d0f22] rounded-[9px] flex items-center justify-center font-black text-white text-[11px] font-mono">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 font-black text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-900 shadow">
                {user?.level ?? 1}
              </div>
            </div>

            <div className="text-left">
              <div className="text-[11px] font-bold text-white leading-tight truncate max-w-[70px]">
                {user?.username || 'Savaşçı'}
              </div>
              <div className="w-12 bg-slate-800 rounded-full h-1 mt-0.5 overflow-hidden p-[0.5px]">
                <div
                  className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Center: Friends Button */}
          <button
            onClick={() => setShowFriends(true)}
            className="flex items-center gap-1 bg-[#171b38] border border-white/15 hover:border-violet-500 px-2 py-1.5 rounded-2xl cursor-pointer active:scale-95 transition"
            title="Arkadaşlar"
          >
            <span className="text-xs">🤝</span>
            <span className="text-[10px] font-bold text-slate-300">Sosyal</span>
          </button>

          {/* Admin Panel shortcut (only visible to Admins) */}
          {user.role === 'Admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 px-2 py-1.5 rounded-2xl cursor-pointer active:scale-95 transition"
              title="Admin Paneli"
            >
              <span className="text-xs">👑</span>
              <span className="text-[10px] font-bold text-amber-400">Admin</span>
            </button>
          )}

          {/* Right: Coin Wallet with Link to Shop */}
          <div
            onClick={() => navigate('/shop')}
            className="relative flex items-center gap-1 bg-[#171b38] border border-amber-400/40 hover:border-amber-300 px-2 py-1.5 rounded-2xl shadow-inner cursor-pointer active:scale-95 transition-transform"
            title="Coin Mağazasına Git"
          >
            <span className="text-xs">💰</span>
            <span className="font-mono font-black text-amber-300 text-xs">
              {user.coinBalance.toLocaleString()}
            </span>

            <button
              onClick={handleClaim}
              disabled={claiming}
              title="Ücretsiz 100 Coin Al"
              className="ml-0.5 w-4 h-4 rounded-md bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 font-black text-[10px] flex items-center justify-center shadow active:scale-90 transition-transform cursor-pointer disabled:opacity-50"
            >
              +
            </button>

            {coinPopup && (
              <div className="absolute -bottom-8 right-0 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-xl shadow-xl animate-bounce z-50 whitespace-nowrap">
                +100 💰 Eklendi!
              </div>
            )}
          </div>

          {/* Audio Mute Button */}
          <button
            onClick={handleToggleMute}
            className="w-7 h-7 rounded-xl bg-[#171b38] border border-white/10 hover:border-violet-400 flex items-center justify-center text-xs cursor-pointer active:scale-90 transition"
            title={muted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {muted ? '🔇' : '🔊'}
          </button>

          {/* Latency Dot */}
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}
            title={`SignalR: ${status} (${latency ?? 0}ms)`}
          />
        </div>
      </header>

      {/* Friends Drawer */}
      <FriendsDrawer isOpen={showFriends} onClose={() => setShowFriends(false)} />
    </>
  );
}
