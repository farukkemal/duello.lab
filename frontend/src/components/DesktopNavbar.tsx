import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { claimCoins } from '../api/rooms';
import { triggerLevelUpConfetti } from '../utils/confetti';
import { isAudioMuted, toggleAudioMute, playCoinSound } from '../utils/audio';
import ViewModeToggle from './ViewModeToggle';
import FriendsDrawer from './FriendsDrawer';
import { getAvatarIcon, getAvatarBg } from '../utils/avatars';
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
    { id: 'pratik', label: 'Solo Pratik', icon: '🎯' },
    { id: 'liderlik', label: 'Sıralama', icon: '🏆' },
    { id: 'magaza', label: 'Mağaza', icon: '🛒', path: '/shop' },
    { id: 'profil', label: 'Profil', icon: '👤' },
  ];

  const isProfileActive = activeTab === 'profil';

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0a0c20]/95 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* 1. BRAND LOGO */}
          <div
            onClick={() => {
              onSelectTab('arena');
              if (location.pathname !== '/dashboard') navigate('/dashboard');
            }}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[2px] shadow-[0_0_20px_rgba(139,92,246,0.5)] group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#0d0f26] rounded-[14px] flex items-center justify-center text-xl">
                ⚔️
              </div>
            </div>
            <div>
              <div className="text-lg font-black text-white tracking-wider flex items-center gap-1.5">
                <span>DÜELLO</span>
                <span className="text-cyan-400 font-mono">.LAB</span>
              </div>
              <div className="text-[10px] text-violet-400 font-bold uppercase tracking-widest -mt-1">
                YKS Rekabet Arenası
              </div>
            </div>
          </div>

          {/* 2. NAVIGATION LINKS */}
          <nav className="hidden md:flex items-center gap-1 bg-[#121532] p-1.5 rounded-2xl border border-white/10 shadow-inner">
            {navItems.map((item) => {
              const isActive = (activeTab === item.id) && location.pathname === '/dashboard';
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.path) {
                      navigate(item.path);
                    } else {
                      onSelectTab(item.id);
                      if (location.pathname !== '/dashboard') navigate('/dashboard');
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none relative ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/40 scale-105'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[8px] bg-rose-600 text-white px-1.5 py-0.2 rounded-full font-black animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 3. USER HUD & ACTIONS */}
          <div className="flex items-center gap-3">
            
            {/* Friends / Social Button */}
            <button
              onClick={() => setShowFriends(true)}
              className="flex items-center gap-1.5 bg-[#121532] hover:bg-[#1b2046] border border-white/10 hover:border-violet-400/50 px-3 py-2 rounded-xl text-xs font-black text-slate-300 hover:text-white transition cursor-pointer"
              title="Arkadaşlar ve İstekler"
            >
              <span>🤝</span>
              <span className="hidden xl:inline">Sosyal</span>
            </button>

            {/* Admin Shortcut */}
            {user.role === 'Admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 hover:border-amber-400 px-3 py-2 rounded-xl text-xs font-black text-amber-300 transition cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                title="Admin Yönetim Paneli"
              >
                <span>👑</span>
                <span className="hidden xl:inline">Admin</span>
              </button>
            )}

            {/* Coin Wallet */}
            <div
              onClick={() => navigate('/shop')}
              className="relative flex items-center gap-2 bg-[#121532] border border-amber-500/30 hover:border-amber-400/60 px-3 py-2 rounded-xl shadow-inner cursor-pointer group select-none"
              title="Coin Mağazasına Git"
            >
              <span className="text-sm group-hover:scale-125 transition-transform">💰</span>
              <span className="font-mono font-black text-amber-400 text-xs">
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
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${getAvatarBg(user?.avatar)} p-[1.5px] shadow`}>
                  <div className="w-full h-full bg-[#0d0f22] rounded-[9px] flex items-center justify-center font-black text-white text-sm select-none">
                    {getAvatarIcon(user?.avatar, user?.username)}
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
