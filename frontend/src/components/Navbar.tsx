import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { claimCoins } from '../api/rooms';
import LiveStatusBadge from './LiveStatusBadge';

export default function Navbar() {
  const { user, logout, refreshUser } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [claimToast, setClaimToast] = useState(false);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      await claimCoins();
      await refreshUser();
      setClaimToast(true);
      setTimeout(() => setClaimToast(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  const getRankTitle = (lvl: number) => {
    if (lvl >= 10) return { title: 'Şampiyon', icon: '👑', color: 'text-amber-300' };
    if (lvl >= 6) return { title: 'Savaşçı', icon: '⚡', color: 'text-purple-300' };
    if (lvl >= 3) return { title: 'Gladyatör', icon: '🛡️', color: 'text-cyan-300' };
    return { title: 'Çaylak', icon: '⚔️', color: 'text-slate-300' };
  };

  const rank = user ? getRankTitle(user.level) : { title: 'Çaylak', icon: '⚔️', color: 'text-slate-300' };
  const currentXp = user ? user.xp % 1000 : 0;
  const xpPercent = Math.min(100, Math.round((currentXp / 1000) * 100));

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-bg)]/80 backdrop-blur-xl border-b border-[var(--color-surface-border)] px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 group transition-transform active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-700 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
              <div className="w-full h-full bg-[#0d0f22] rounded-[10px] flex items-center justify-center">
                <span className="text-xl group-hover:rotate-12 transition-transform duration-300">⚔️</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white font-mono">
                  duello<span className="text-[var(--color-secondary)]">.lab</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  v2.4
                </span>
              </div>
            </div>
          </Link>

          <div className="hidden md:block pl-2">
            <LiveStatusBadge />
          </div>
        </div>

        {/* User HUD / Actions */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* Coins Wallet Badge */}
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-amber-500/30 px-3 py-1.5 rounded-xl shadow-inner">
                <span className="text-sm animate-pulse">💰</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {user.coinBalance.toLocaleString()}
                </span>
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  title="Test için 100 Coin Al"
                  className="ml-1 text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {claiming ? '...' : '+100'}
                </button>
              </div>

              {/* Toast */}
              {claimToast && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-lg animate-bounce">
                  +100 💰 Eklendi!
                </div>
              )}
            </div>

            {/* Level & Rank Pill */}
            <div className="hidden sm:flex items-center gap-2.5 bg-[var(--color-surface)] border border-[var(--color-surface-border)] px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-800 flex items-center justify-center font-bold text-xs text-white shadow">
                {user.level}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1 text-xs font-bold leading-none">
                  <span className={rank.color}>{rank.icon} {rank.title}</span>
                </div>
                <div className="w-16 bg-white/10 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-cyan-400 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-[1px]">
                <div className="w-full h-full bg-[#12142b] rounded-[11px] flex items-center justify-center font-bold text-white text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>

              <button
                onClick={logout}
                title="Çıkış Yap"
                className="p-2 rounded-xl bg-[var(--color-surface)] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[var(--color-surface-border)] hover:border-rose-500/30 transition active:scale-95 cursor-pointer text-xs font-semibold"
              >
                Çıkış
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition"
            >
              Giriş Yap
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl shadow-lg shadow-purple-500/20 transition"
            >
              Kayıt Ol
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
