import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { claimCoins } from '../api/rooms';
import { triggerLevelUpConfetti } from '../utils/confetti';
import { isAudioMuted, toggleAudioMute, playCoinSound } from '../utils/audio';
import ViewModeToggle from './ViewModeToggle';
import FriendsDrawer from './FriendsDrawer';
import type { MobileTab } from './MobileBottomNav';

interface DesktopNavbarProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
}

export default function DesktopNavbar({ activeTab, onSelectTab }: DesktopNavbarProps) {
  const { user, refreshUser } = useAuth();
  const { status, latency } = useSignalR();
  const navigate = useNavigate();
  const location = useLocation();

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

  const xpCurrent = (user?.xp ?? 0) % 1000;
  const xpPercent = Math.min(100, Math.round((xpCurrent / 1000) * 100));

  const navItems: { id: MobileTab; label: string; icon: string; path?: string; badge?: string }[] = [
    { id: 'arena', label: 'Arena', icon: '🏠' },
    { id: 'duello', label: 'Düellolar', icon: '⚔️', badge: 'CANLI' },
    { id: 'klan', label: 'Klanlar', icon: '🏰', path: '/clan' },
    { id: 'pratik', label: 'Pratik Sınav', icon: '📝' },
    { id: 'magaza', label: 'Mağaza', icon: '🛒', path: '/shop' },
  ];

  const isProfileActive = activeTab === 'profil' && location.pathname === '/dashboard';

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#080a1a]/95 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] px-4 xl:px-8 py-2.5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          
          {/* ========================================================
              1. LEFT: BRAND LOGO & MOTTO
              ======================================================== */}
          <div
            onClick={() => {
              onSelectTab('arena');
              if (location.pathname !== '/dashboard') navigate('/dashboard?tab=arena');
            }}
            className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[2px] shadow-lg shadow-violet-900/30 group-hover:shadow-violet-500/50 group-hover:scale-105 transition-all">
              <div className="w-full h-full bg-[#090b1e] rounded-[14px] flex items-center justify-center text-xl font-black">
                ⚔️
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white tracking-tight leading-none group-hover:text-cyan-300 transition-colors">
                  duello<span className="text-violet-400">.lab</span>
                </span>
                <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">YKS Rekabet Arenası</p>
            </div>
          </div>

          {/* ========================================================
              2. CENTER: SLEEK NAVIGATION TABS (NO WRAPPING)
              ======================================================== */}
          <nav className="flex items-center bg-[#11142f]/90 border border-white/10 rounded-2xl p-1 gap-1 shadow-inner shrink-0">
            {navItems.map((item) => {
              const isActive =
                (item.path && location.pathname === item.path) ||
                (!item.path && activeTab === item.id && location.pathname === '/dashboard');

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.path) {
                      navigate(item.path);
                    } else {
                      onSelectTab(item.id);
                      if (location.pathname !== '/dashboard') navigate(`/dashboard?tab=${item.id}`);
                    }
                  }}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 cursor-pointer select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] border border-violet-400/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/8'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>

                  {item.badge && (
                    <span className="text-[8px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* ========================================================
              3. RIGHT: PLAYER STATS, WALLET, CONTROLS & PROFILE
              ======================================================== */}
          <div className="flex items-center gap-2.5 shrink-0">
            
            {/* Friends Button */}
            <button
              onClick={() => setShowFriends(true)}
              className="flex items-center gap-1.5 bg-[#121532] hover:bg-[#1b2046] border border-white/10 hover:border-violet-400/40 px-3 py-2 rounded-xl cursor-pointer active:scale-95 transition text-xs font-bold text-slate-200 shadow-sm whitespace-nowrap"
              title="Çevrimiçi Arkadaşlar & İstekler"
            >
              <span>🤝</span>
              <span className="hidden xl:inline">Arkadaşlar</span>
            </button>

            {/* Admin Panel shortcut */}
            {user.role === 'Admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 hover:border-amber-400 px-3 py-2 rounded-xl cursor-pointer active:scale-95 transition text-xs font-bold text-amber-300 whitespace-nowrap"
                title="Admin Yönetim Paneli"
              >
                <span>👑</span>
                <span className="hidden xl:inline">Admin</span>
              </button>
            )}

            {/* Coin Wallet */}
            <div
              onClick={() => navigate('/shop')}
              className="relative flex items-center gap-2 bg-[#121532] hover:bg-[#1b2046] border border-amber-400/40 hover:border-amber-400 px-3 py-1.5 rounded-xl shadow-inner cursor-pointer active:scale-95 transition"
              title="Coin Mağazasına Git"
            >
              <span className="text-base">💰</span>
              <span className="font-mono font-black text-amber-300 text-xs sm:text-sm whitespace-nowrap">
                {(user?.coinBalance ?? 0).toLocaleString()}
              </span>

              <button
                onClick={handleClaim}
                disabled={claiming}
                title="Ücretsiz 100 Coin Al"
                className="w-5 h-5 rounded-md bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow active:scale-90 transition cursor-pointer disabled:opacity-50"
              >
                +
              </button>

              {coinPopup && (
                <div className="absolute -bottom-8 right-0 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-xl shadow-xl animate-bounce z-50 whitespace-nowrap">
                  +100 💰 Eklendi!
                </div>
              )}
            </div>

            {/* Profile & Analytics Pill Card */}
            <div
              onClick={() => {
                onSelectTab('profil');
                if (location.pathname !== '/dashboard') navigate('/dashboard?tab=profil');
              }}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer active:scale-95 transition select-none ${
                isProfileActive
                  ? 'bg-gradient-to-r from-violet-600/30 to-cyan-500/30 border-2 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                  : 'bg-[#121532] hover:bg-[#1b2046] border border-white/10 hover:border-violet-400/40'
              }`}
              title="Profil ve Sınav Analizlerini Görüntüle"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1.5px] shadow">
                  <div className="w-full h-full bg-[#0d0f22] rounded-[9px] flex items-center justify-center font-black text-white text-xs font-mono">
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 font-black text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-900 shadow">
                  {user?.level ?? 1}
                </div>
              </div>

              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white leading-tight truncate max-w-[85px]">
                    {user?.username || 'Savaşçı'}
                  </span>
                  <span className="text-[9px] text-cyan-300 font-mono font-bold">Lv.{user.level}</span>
                </div>
                <div className="w-20 bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Audio Mute Button */}
            <button
              onClick={handleToggleMute}
              className="w-8 h-8 rounded-xl bg-[#121532] border border-white/10 hover:border-violet-400 flex items-center justify-center text-sm cursor-pointer active:scale-90 transition"
              title={muted ? 'Sesi Aç' : 'Sesi Kapat'}
            >
              {muted ? '🔇' : '🔊'}
            </button>

            {/* View Mode Toggle Switch [ 📱 Mobil | 💻 PC ] */}
            <ViewModeToggle />

            {/* SignalR Connection Dot */}
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                status === 'connected'
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                  : 'bg-rose-500'
              }`}
              title={`SignalR: ${status} (${latency ?? 0}ms)`}
            />
          </div>

        </div>
      </header>

      <FriendsDrawer isOpen={showFriends} onClose={() => setShowFriends(false)} />
    </>
  );
}
