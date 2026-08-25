import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  CrossedSwordsGraphic,
  HourglassBombGraphic,
  ClashCrownsGraphic,
  RobotMascotGraphic
} from '../ArenaGraphics';
import { getWeaknessReport, type AiCoachReport } from '../../api/analytics';
import { getTopClans, type ClanListItem } from '../../api/social';
import { type GameMode, GameModeEnum } from '../../api/rooms';
import type { OnlineStats } from '../../contexts/SignalRContext';

interface DesktopArenaViewProps {
  onStartMatchmaking: (mode: GameMode) => void;
  onStartBotPractice: () => void;
  onSelectCategory: (cat: 'TYT' | 'AYT') => void;
  selectedCategory: 'TYT' | 'AYT';
  activeRooms?: any[];
  onOpenCreateLobby: () => void;
  onOpenJoinCode: () => void;
  stats: OnlineStats | null;
}

export default function DesktopArenaView({
  onStartMatchmaking,
  onStartBotPractice,
  onSelectCategory,
  selectedCategory,
  activeRooms = [],
  onOpenCreateLobby,
  onOpenJoinCode,
  stats
}: DesktopArenaViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [aiReport, setAiReport] = useState<AiCoachReport | null>(null);
  const [topClans, setTopClans] = useState<ClanListItem[]>([]);

  useEffect(() => {
    getWeaknessReport().then(({ data }) => setAiReport(data)).catch(() => {});
    getTopClans(5).then(({ data }) => setTopClans(data)).catch(() => {});
  }, []);

  if (!user) return null;

  const xpCurrent = user.xp % 1000;
  const xpPercent = Math.min(100, Math.round((xpCurrent / 1000) * 100));

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      
      {/* 3-Column Desktop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================
            LEFT COLUMN (Col 1-3): Player Profile & AI Coach Widget
            ======================================================== */}
        <aside className="lg:col-span-3 space-y-4">
          
          {/* User Profile Card */}
          <div className="game-card-3d p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[2px] shadow-lg">
                <div className="w-full h-full bg-[#0d0f22] rounded-[14px] flex items-center justify-center font-black text-white text-lg">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-white truncate">{user?.username || 'Savaşçı'}</h3>
                  <span className="text-[9px] bg-violet-600/40 text-violet-300 border border-violet-500/30 px-1.5 py-0.2 rounded font-black">
                    Lv.{user?.level ?? 1}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email || ''}</p>
              </div>
            </div>

            {/* XP Bar */}
            <div className="space-y-1 bg-black/30 p-2.5 rounded-xl border border-white/5">
              <div className="flex justify-between text-[10px] font-bold font-mono">
                <span className="text-slate-400">Seviye İlerlemesi</span>
                <span className="text-cyan-400">{xpCurrent} / 1000 XP</span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <div className="text-[9px] text-slate-400 font-bold">🏆 Kupa</div>
                <div className="text-sm font-mono font-black text-amber-300">1,240</div>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <div className="text-[9px] text-slate-400 font-bold">💰 Bakiye</div>
                <div className="text-sm font-mono font-black text-amber-400">{user.coinBalance.toLocaleString()}</div>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard?tab=profil', { state: { tab: 'profil' } })}
              className="w-full py-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 font-bold text-xs transition cursor-pointer"
            >
              📊 Detaylı Analizleri İncele ➔
            </button>
          </div>

          {/* AI Coach Personal Recommendation */}
          <div className="game-card-3d p-4 space-y-2.5 border-violet-500/30 bg-gradient-to-b from-[#161a38] to-[#0f1228]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <h4 className="text-xs font-black text-white">AI Sınav Koçu Analizi</h4>
            </div>

            {aiReport ? (
              <div className="space-y-2">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 text-left">
                  <div className="text-[9px] text-emerald-400 font-bold uppercase">En Güçlü Branş</div>
                  <div className="text-xs font-black text-white">{aiReport.strongestBranch}</div>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2 text-left">
                  <div className="text-[9px] text-rose-400 font-bold uppercase">Odaklanılacak Ders</div>
                  <div className="text-xs font-black text-white">{aiReport.weakestBranch}</div>
                </div>

                <div className="text-[10px] text-slate-300 leading-relaxed bg-black/30 p-2 rounded-xl border border-white/5">
                  💡 {aiReport.aiAdviceList[0] || 'Bugün 1v1 düellolarda geometri hızını artır.'}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 py-3 text-center font-bold">
                AI Analizi yükleniyor...
              </div>
            )}
          </div>

          {/* Daily Quest Card */}
          <div className="game-card-3d p-4 space-y-2.5 bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border-cyan-500/30">
            <div className="flex items-center justify-between text-xs font-black text-white">
              <span className="flex items-center gap-1.5">
                <span>🎯</span>
                <span>Günün Görevi</span>
              </span>
              <span className="text-amber-300 font-mono text-[11px]">+100 💰</span>
            </div>
            <p className="text-[11px] text-slate-300">1 Düello Kazan (TYT veya AYT)</p>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full w-2/3 shadow-[0_0_8px_#22d3ee]" />
            </div>
          </div>

        </aside>

        {/* ========================================================
            CENTER COLUMN (Col 4-9): Hero Turnuva & 4 Game Modes
            ======================================================== */}
        <main className="lg:col-span-6 space-y-4">
          
          {/* Subheader Toolbar: TYT/AYT Toggle & Live Counter */}
          <div className="flex items-center justify-between bg-[#121533] p-2 rounded-2xl border border-white/10 shadow-lg">
            
            {/* Category Segmented Switch */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => onSelectCategory('TYT')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  selectedCategory === 'TYT'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                TYT Modu
              </button>

              <button
                onClick={() => onSelectCategory('AYT')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  selectedCategory === 'AYT'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                AYT Modu
              </button>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{stats ? stats.onlineUsersCount * 12 + 180 : 180} Çevrimiçi Oyuncu</span>
            </div>
          </div>

          {/* Hero Featured Turnuva Banner */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-700 via-rose-900 to-violet-950 p-6 border-2 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.25)] flex flex-col justify-between min-h-[190px]">
            {/* Background Texture Accents */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-2 right-4 text-6xl opacity-20 pointer-events-none select-none font-black">
              🏆
            </div>

            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                <span>🔥 GÜNÜN BÜYÜK ETKİNLİĞİ</span>
                <span>• CANLI 180 OYUNCU</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-md">
                BATTLEGROUND TURNUVASI
              </h2>
              <p className="text-xs text-amber-100/90 font-medium max-w-md">
                100 Kişilik Dev Canlı Hayatta Kalma Arenası! Her 3 soruda daralan güvenli alan ve dev ödül havuzu.
              </p>
            </div>

            <div className="relative z-10 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs font-mono font-black text-amber-300">
                <span>💰 Ödül: 5,000 Coin</span>
                <span>• ⏱️ Giriş: 50 Coin</span>
              </div>

              <button
                onClick={() => onStartMatchmaking(GameModeEnum.Battleground100)}
                className="px-6 py-3 rounded-2xl btn-game-gold text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>🏆 TURNUVAYA KATIL</span>
                <span>➔</span>
              </button>
            </div>
          </div>

          {/* 2x2 Tactical Game Modes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. 1v1 Hızlı Düello */}
            <div className="game-card-3d p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-violet-400 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] bg-violet-500/20 border border-violet-500/40 text-violet-300 px-2 py-0.5 rounded-full font-black uppercase">
                    DERECELİ
                  </span>
                  <h3 className="text-base font-black text-white mt-1">1v1 Hızlı Düello</h3>
                  <p className="text-[11px] text-slate-300">Birebir canlı hız ve bilgi kapışması</p>
                </div>
                <div className="w-14 h-14 shrink-0 -mt-1 -mr-1">
                  <CrossedSwordsGraphic />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-mono font-bold">Geçmiş G/M: 3/1</span>
                <button
                  onClick={() => onStartMatchmaking(GameModeEnum.Ranked1v1)}
                  className="px-4 py-2 rounded-xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer active:scale-95 transition flex items-center gap-1 shadow"
                >
                  <span>⚡ 1V1 OYNA</span>
                </button>
              </div>
            </div>

            {/* 2. Ani Ölüm */}
            <div className="game-card-3d p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-rose-400 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] bg-rose-500/20 border border-rose-500/40 text-rose-300 px-2 py-0.5 rounded-full font-black uppercase">
                    TURBO
                  </span>
                  <h3 className="text-base font-black text-white mt-1">Ani Ölüm</h3>
                  <p className="text-[11px] text-slate-300">İlk yanlış yapan elenir, en hızlı kazanır</p>
                </div>
                <div className="w-14 h-14 shrink-0 -mt-1 -mr-1">
                  <HourglassBombGraphic />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-mono font-bold">Rekor Süre: 14s</span>
                <button
                  onClick={() => onStartMatchmaking(GameModeEnum.SuddenDeath)}
                  className="px-4 py-2 rounded-xl btn-game-danger text-white font-black text-xs uppercase cursor-pointer active:scale-95 transition flex items-center gap-1 shadow"
                >
                  <span>⏱️ BAŞLA</span>
                </button>
              </div>
            </div>

            {/* 3. 2v2 Takım Savaşı */}
            <div className="game-card-3d p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-cyan-400 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded-full font-black uppercase">
                    TAKIM
                  </span>
                  <h3 className="text-base font-black text-white mt-1">2v2 Takım Savaşı</h3>
                  <p className="text-[11px] text-slate-300">Arkadaşınla ortak puan toplayarak yarış</p>
                </div>
                <div className="w-14 h-14 shrink-0 -mt-1 -mr-1">
                  <ClashCrownsGraphic />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-mono font-bold">Sıralama: #7</span>
                <button
                  onClick={() => onStartMatchmaking(GameModeEnum.Squad2v2)}
                  className="px-4 py-2 rounded-xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer active:scale-95 transition flex items-center gap-1 shadow"
                >
                  <span>👥 2V2 EŞLEŞ</span>
                </button>
              </div>
            </div>

            {/* 4. Bot Pratik Antrenman */}
            <div className="game-card-3d p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-emerald-400 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full font-black uppercase">
                    PRATİK
                  </span>
                  <h3 className="text-base font-black text-white mt-1">Bot Pratik</h3>
                  <p className="text-[11px] text-slate-300">Yapay zeka rakiple risksiz antrenman</p>
                </div>
                <div className="w-14 h-14 shrink-0 -mt-1 -mr-1">
                  <RobotMascotGraphic />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-mono font-bold">Yüksek Skor: 880</span>
                <button
                  onClick={onStartBotPractice}
                  className="px-4 py-2 rounded-xl btn-game-success text-white font-black text-xs uppercase cursor-pointer active:scale-95 transition flex items-center gap-1 shadow"
                >
                  <span>🤖 ANTRENMAN</span>
                </button>
              </div>
            </div>

          </div>

          {/* Quick Custom Room Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onOpenCreateLobby}
              className="flex-1 py-3 rounded-2xl bg-[#171b38] hover:bg-[#20254c] border border-white/15 text-white font-black text-xs uppercase cursor-pointer active:scale-95 transition flex items-center justify-center gap-2 shadow"
            >
              <span>🔑</span>
              <span>Özel Lobi Kur</span>
            </button>

            <button
              onClick={onOpenJoinCode}
              className="flex-1 py-3 rounded-2xl bg-[#171b38] hover:bg-[#20254c] border border-white/15 text-white font-black text-xs uppercase cursor-pointer active:scale-95 transition flex items-center justify-center gap-2 shadow"
            >
              <span>🎯</span>
              <span>Koda Katıl</span>
            </button>
          </div>

        </main>

        {/* ========================================================
            RIGHT COLUMN (Col 10-12): Top Clans & Active Radar
            ======================================================== */}
        <aside className="lg:col-span-3 space-y-4">
          
          {/* Top Clans Leaderboard */}
          <div className="game-card-3d p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <span>🏆</span>
                <span>En Güçlü Loncalar</span>
              </h4>
              <button
                onClick={() => navigate('/clan')}
                className="text-[10px] text-violet-400 hover:text-violet-300 font-bold cursor-pointer"
              >
                Tümü ➔
              </button>
            </div>

            <div className="space-y-2">
              {topClans.length === 0 ? (
                <div className="text-[11px] text-slate-400 py-3 text-center font-bold">
                  Loncalar yükleniyor...
                </div>
              ) : (
                topClans.map((clan, idx) => (
                  <div
                    key={clan.id}
                    onClick={() => navigate('/clan')}
                    className="flex items-center justify-between bg-black/30 hover:bg-white/5 p-2 rounded-xl border border-white/5 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{clan.badgeIcon}</span>
                      <div className="truncate">
                        <div className="text-xs font-black text-white truncate">
                          [{clan.tag}] {clan.name}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          {clan.memberCount} Üye
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono font-black text-cyan-400 text-xs shrink-0">
                      #{idx + 1}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Live Rooms Stream */}
          <div className="game-card-3d p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <span>📡</span>
                <span>Açık Lobiler ({activeRooms.length})</span>
              </h4>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {activeRooms.length === 0 ? (
                <div className="text-[11px] text-slate-400 py-4 text-center font-bold">
                  Şu an açık özel lobi yok. İlk lobiyi sen kur!
                </div>
              ) : (
                activeRooms.map((room) => (
                  <div
                    key={room.code}
                    className="flex items-center justify-between bg-black/30 p-2.5 rounded-xl border border-white/5"
                  >
                    <div>
                      <div className="text-xs font-black text-white">{room.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {room.playersCount}/{room.maxPlayers} Oyuncu • {room.category}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/lobby/${room.code}`)}
                      className="px-2.5 py-1 rounded-lg bg-violet-600 text-white font-black text-[10px] uppercase cursor-pointer hover:bg-violet-500 transition"
                    >
                      Katıl
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
}
