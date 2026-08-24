import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { getSoloExams, type ExamListItem } from '../api/exams';
import { createRoom, joinRoom, createBattleground, type GameMode } from '../api/rooms';
import MobileTopHUD from '../components/MobileTopHUD';
import MobileBottomNav, { type MobileTab } from '../components/MobileBottomNav';
import MatchmakingModal from '../components/MatchmakingModal';
import AiCoachReportModal from '../components/AiCoachReportModal';
import BotMatchModal from '../components/BotMatchModal';


export default function DashboardPage() {
  const { user, logout, refreshUser } = useAuth();
  const { stats, status } = useSignalR();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const initialTab = (searchParams.get('tab') as MobileTab) || (location.state?.tab as MobileTab) || 'arena';
  const [activeTab, setActiveTab] = useState<MobileTab>(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as MobileTab;
    const tabFromState = location.state?.tab as MobileTab;
    const target = tabFromUrl || tabFromState;
    if (target && target !== activeTab) {
      setActiveTab(target);
    }
  }, [searchParams, location.state]);
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('TYT');

  // Matchmaking Modal state
  const [matchmakingMode, setMatchmakingMode] = useState<GameMode | null>(null);
  const [showAiCoach, setShowAiCoach] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);


  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomTitle, setRoomTitle] = useState('YKS Hızlı Düello');
  const [roomCategory, setRoomCategory] = useState('TYT');
  const [roomQuestionCount, setRoomQuestionCount] = useState(3);
  const [joinCode, setJoinCode] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    getSoloExams()
      .then(({ data }) => setExams(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const xpCurrent = user.xp % 1000;
  const xpPercent = Math.min(100, Math.round((xpCurrent / 1000) * 100));
  const xpLeft = 1000 - xpCurrent;

  const handleStartBattleground = async () => {
    setModalLoading(true);
    try {
      const { data } = await createBattleground({
        title: '🔥 100 Kişilik Dev Battleground Turnuvası',
        category: selectedCategory,
        questionCount: 9,
      });
      navigate(`/lobby/${data.roomCode}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Battleground başlatılamadı.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalLoading(true);
    try {
      const { data } = await createRoom({
        title: roomTitle,
        category: roomCategory,
        questionCount: roomQuestionCount,
      });
      await refreshUser();
      navigate(`/lobby/${data.roomCode}`);
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Oda oluşturulamadı.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setModalError(null);
    setModalLoading(true);
    try {
      const code = joinCode.trim().toUpperCase();
      await joinRoom(code);
      navigate(`/lobby/${code}`);
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Odaya katılınamadı.');
    } finally {
      setModalLoading(false);
    }
  };

  const categories = ['TÜMÜ', 'TYT', 'AYT'];
  const filteredExams = selectedCategory === 'TÜMÜ'
    ? exams
    : exams.filter(e => e.category.toUpperCase() === selectedCategory.toUpperCase());

  return (
    <div className="h-screen h-[100dvh] bg-[#060710] flex justify-center overflow-hidden">
      <div className="w-full max-w-md mobile-app-shell flex flex-col relative overflow-hidden">
        
        {/* Top Game HUD Bar */}
        <MobileTopHUD onOpenProfile={() => setActiveTab('profil')} />

        {/* Dynamic Mobile Game Screen Content */}
        <main className="flex-1 px-4 py-4 overflow-y-auto no-scrollbar pb-6 space-y-4">
          
          {/* TAB 1: ARENA (4 NEW GAME MODES SELECTION) */}
          {activeTab === 'arena' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Daily Quest Card */}
              <div className="bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-cyan-500/20 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl animate-bounce-subtle">🎯</span>
                  <div>
                    <div className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
                      Günün Görevi
                    </div>
                    <div className="text-xs font-bold text-white">1 Canlı Düelloda Podyuma Çık!</div>
                  </div>
                </div>
                <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-xl text-xs font-mono font-black">
                  +100 💰
                </div>
              </div>

              {/* AI Coach Banner Card */}
              <div
                onClick={() => setShowAiCoach(true)}
                className="bg-gradient-to-r from-violet-950/70 via-purple-950/60 to-indigo-950/70 border-2 border-violet-500/50 hover:border-violet-400 rounded-2xl p-3 flex items-center justify-between shadow-xl cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl animate-bounce-subtle">🧠</div>
                  <div>
                    <div className="inline-block bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[9px] font-black px-2 py-0.2 rounded-full uppercase mb-0.5">
                      AI Sınav Koçu
                    </div>
                    <h4 className="text-xs font-black text-white">Zayıf Nokta Isı Haritası</h4>
                    <p className="text-[10px] text-slate-300">Ders bazlı net analizi ve kişisel tavsiyeler</p>
                  </div>
                </div>
                <span className="text-xs font-black text-violet-300 bg-violet-600/30 px-2.5 py-1.5 rounded-xl border border-violet-500/40">İncele ➔</span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-2 justify-center">
                {['TYT', 'AYT'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg'
                        : 'bg-[#171b38] text-slate-400 border border-white/10'
                    }`}
                  >
                    {cat} Arenası
                  </button>
                ))}
              </div>

              {/* 1. FEATURED: 100-PLAYER BATTLEGROUND (BATTLE ROYALE) */}
              <div className="bg-gradient-to-br from-rose-900/40 via-purple-900/40 to-[#10132b] border-2 border-rose-500/50 rounded-3xl p-4 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-2 right-2 bg-rose-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase animate-pulse">
                  CANLI TURNUVA
                </div>

                <div className="text-4xl mb-1 animate-bounce-subtle">🔥</div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  100 Kişilik Battleground
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5 max-w-xs mx-auto">
                  3 soruda bir alan daralır, en düşük %10 elenir! Son 3'e dev ödül havuzu.
                </p>

                <button
                  onClick={handleStartBattleground}
                  disabled={modalLoading}
                  className="mt-3 w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 font-black text-xs uppercase tracking-wider text-white shadow-xl cursor-pointer active:scale-95 transition-transform"
                >
                  {modalLoading ? 'Açılıyor...' : '🏆 Battleground Turnuvasına Katıl'}
                </button>
              </div>

              {/* 2. RANKED 1V1 QUICK PLAY (MATCHMAKING) */}
              <div className="game-card-3d p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <h4 className="text-sm font-black text-white leading-tight">Dereceli 1v1 Hızlı Eşleşme</h4>
                      <p className="text-[10px] text-slate-400">3 saniyede rastgele rakip bul</p>
                    </div>
                  </div>
                  <span className="bg-violet-500/20 text-violet-300 text-[9px] font-black px-2 py-0.5 rounded-md border border-violet-500/30">
                    ÜCRETSİZ
                  </span>
                </div>

                <button
                  onClick={() => setMatchmakingMode(1)}
                  className="w-full py-3 rounded-xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer"
                >
                  ⚡ Hemen 1v1 Oyna ➔
                </button>
              </div>

              {/* 3. SUDDEN DEATH (ANİ ÖLÜM) */}
              <div className="game-card-3d p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⏱️</span>
                    <div>
                      <h4 className="text-sm font-black text-white leading-tight">Ani Ölüm (Sudden Death)</h4>
                      <p className="text-[10px] text-slate-400">15s süre, ilk yanlışta elenme!</p>
                    </div>
                  </div>
                  <span className="bg-rose-500/20 text-rose-300 text-[9px] font-black px-2 py-0.5 rounded-md border border-rose-500/30">
                    TURBO
                  </span>
                </div>

                <button
                  onClick={() => setMatchmakingMode(3)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 font-black text-xs uppercase text-white shadow-lg cursor-pointer active:scale-95"
                >
                  ⏱️ Ani Ölüm Modunu Başlat ➔
                </button>
              </div>

              {/* 4. SQUAD 2V2 (TAKIM SAVAŞI) */}
              <div className="game-card-3d p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👑</span>
                    <div>
                      <h4 className="text-sm font-black text-white leading-tight">2v2 Takım Savaşı (Squad)</h4>
                      <p className="text-[10px] text-slate-400">Kırmızı vs Mavi Takım ortak net skoru</p>
                    </div>
                  </div>
                  <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-black px-2 py-0.5 rounded-md border border-cyan-500/30">
                    TAKIM
                  </span>
                </div>

                <button
                  onClick={() => setMatchmakingMode(4)}
                  className="w-full py-3 rounded-xl btn-game-secondary font-black text-xs uppercase cursor-pointer"
                >
                  👑 2v2 Eşleşme Kuyruğuna Gir ➔
                </button>
              </div>

              {/* 5. CUSTOM ROOMS (CREATE / JOIN) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="py-3 rounded-xl btn-game-gold font-black text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🏰 Özel Lobi (50 💰)</span>
                </button>

                <button
                  onClick={() => setShowJoinModal(true)}
                  className="py-3 rounded-xl bg-[#1b2046] border border-white/15 hover:border-violet-500 font-black text-[11px] text-white uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🔑 Koda Katıl</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: DUELLO */}
          {activeTab === 'duello' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center py-2">
                <h3 className="text-xl font-black text-white">Çok Oyunculu Düellolar</h3>
                <p className="text-xs text-slate-400 mt-0.5">Arkadaşlarınla veya rakiplerle anlık eşleş</p>
              </div>

              <div className="game-card-3d p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                  <span>👑</span> <span>Özel Lobi Başlat</span>
                </div>
                <p className="text-xs text-slate-300">
                  4 haneli benzersiz oda kodu oluşturulur. Arkadaşlarına kodu ilet ve savaşı başlat!
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full py-3.5 rounded-2xl btn-game-gold font-black text-sm uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Lobi Kur (50 Coin)</span>
                </button>
              </div>

              <div className="game-card-3d p-4 space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-black text-sm">
                  <span>🔑</span> <span>Arkadaşının Odasına Gir</span>
                </div>
                <p className="text-xs text-slate-300">
                  Sana iletilen 4 haneli kodu girerek lobideki yerini al.
                </p>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="w-full py-3.5 rounded-2xl btn-game-secondary font-black text-sm uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Kodu Gir ve Katıl</span>
                </button>
              </div>

              {/* Botlarla Kendini Geliştir */}
              <div className="game-card-3d p-4 space-y-3 relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                  ÜCRETSİZ
                </div>
                <div className="flex items-center gap-2 text-violet-300 font-black text-sm">
                  <span>🤖</span> <span>Botlarla Kendini Geliştir</span>
                </div>
                <p className="text-xs text-slate-300">
                  YKS sıralamasına göre bot rakipler seç — kendi hızında antrenman yap!
                </p>
                {/* Mini bot previews */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { emoji: '🐢', name: 'Berkay', sub: '1.000.000\'uncusu', color: 'bg-slate-700/60' },
                    { emoji: '🌱', name: 'Selin',  sub: '500.000\'incisi',   color: 'bg-emerald-900/60' },
                    { emoji: '⚡', name: 'Emre',   sub: '100.000\'incisi',   color: 'bg-cyan-900/60' },
                    { emoji: '🔥', name: 'Nur',    sub: '50.000\'incisi',    color: 'bg-orange-900/60' },
                    { emoji: '💎', name: 'Esma',   sub: '100\'üncüsü',      color: 'bg-violet-900/60' },
                  ].map(b => (
                    <div key={b.name} className={`${b.color} rounded-xl px-2 py-1 flex items-center gap-1 border border-white/10`}>
                      <span className="text-sm">{b.emoji}</span>
                      <div>
                        <div className="text-[9px] font-black text-white">{b.name}</div>
                        <div className="text-[8px] text-slate-400 font-mono">{b.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowBotModal(true)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 font-black text-sm uppercase text-white shadow-xl cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <span>🤖 Bot Antrenmanını Başlat</span>
                </button>
              </div>

            </div>

          )}

          {/* TAB 3: PRATIK */}
          {activeTab === 'pratik' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white">Solo Pratik</h3>
                  <p className="text-xs text-slate-400">Kendi hızında netlerini geliştir</p>
                </div>

                <div className="flex gap-1 bg-[#171b38] p-1 rounded-xl border border-white/10">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-violet-600 text-white shadow'
                          : 'text-slate-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredExams.map((exam) => (
                  <div
                    key={exam.id}
                    onClick={() => navigate(`/exam/${exam.id}`)}
                    className="game-card-3d p-4 flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
                  >
                    <div>
                      <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30 mb-1.5">
                        {exam.category}
                      </div>
                      <h4 className="text-sm font-black text-white leading-tight">{exam.title}</h4>
                      <div className="text-[11px] text-slate-400 mt-1 font-mono">
                        {exam.questionCount} Soru • +{exam.questionCount * 10} XP
                      </div>
                    </div>

                    <button className="px-4 py-2 rounded-xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer">
                      Başla
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LIDERLIK */}
          {activeTab === 'liderlik' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center py-2">
                <h3 className="text-xl font-black text-white">🏆 Arena Podyumu</h3>
                <p className="text-xs text-slate-400 mt-0.5">En yüksek net skora sahip savaşçılar</p>
              </div>

              <div className="bg-gradient-to-b from-[#1c2146] to-[#12142d] rounded-3xl p-4 border border-white/10 flex items-end justify-center gap-2 pt-6 shadow-xl">
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-2xl mb-1">🥈</div>
                  <div className="text-[11px] font-bold text-white truncate max-w-[80px]">Ayşe_K</div>
                  <div className="text-[9px] font-mono text-cyan-400 font-bold mb-1">2.8 Net</div>
                  <div className="w-full bg-slate-600/40 border-t-2 border-slate-400 rounded-t-xl h-20 flex items-center justify-center font-black text-slate-300 text-lg">
                    2
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center">
                  <div className="text-3xl mb-1 animate-bounce-subtle">👑</div>
                  <div className="text-xs font-black text-amber-300 truncate max-w-[90px]">Efe_YKS</div>
                  <div className="text-[10px] font-mono text-emerald-400 font-black mb-1">3.0 Net</div>
                  <div className="w-full bg-amber-500/30 border-t-2 border-amber-400 rounded-t-xl h-28 flex flex-col items-center justify-center font-black text-amber-300 text-2xl">
                    1
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center">
                  <div className="text-2xl mb-1">🥉</div>
                  <div className="text-[11px] font-bold text-white truncate max-w-[80px]">Mehmet_99</div>
                  <div className="text-[9px] font-mono text-cyan-400 font-bold mb-1">2.5 Net</div>
                  <div className="w-full bg-amber-900/40 border-t-2 border-amber-700 rounded-t-xl h-16 flex items-center justify-center font-black text-amber-600 text-base">
                    3
                  </div>
                </div>
              </div>

              <div className="bg-[#171b38] border-2 border-violet-500 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-violet-400 text-lg">#4</span>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{user.username}</span>
                      <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.2 rounded font-black">SEN</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">Seviye {user.level} • {user.xp} XP</div>
                  </div>
                </div>
                <div className="text-right font-mono font-black text-amber-300 text-sm">
                  {user.coinBalance} 💰
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PROFIL */}
          {activeTab === 'profil' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="game-card-3d p-6 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-0.5 shadow-xl">
                  <div className="w-full h-full bg-[#0d0f22] rounded-[22px] flex items-center justify-center text-3xl font-black text-white font-mono">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white">{user.username}</h3>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>

                <div className="bg-black/30 rounded-2xl p-3 border border-white/5 text-left space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">Seviye {user.level}</span>
                    <span className="text-violet-400 font-mono">{xpCurrent} / 1000 XP</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    Sonraki seviyeye {xpLeft} XP kaldı
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#171b38] border border-white/10 rounded-2xl p-3.5 text-center">
                  <div className="text-xs text-slate-400 font-bold">Toplam XP</div>
                  <div className="text-xl font-mono font-black text-cyan-400 mt-0.5">{user.xp.toLocaleString()}</div>
                </div>
                <div className="bg-[#171b38] border border-white/10 rounded-2xl p-3.5 text-center">
                  <div className="text-xs text-slate-400 font-bold">Coin Bakiyesi</div>
                  <div className="text-xl font-mono font-black text-amber-400 mt-0.5">{user.coinBalance.toLocaleString()} 💰</div>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full py-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 font-black text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Oturumu Kapat
              </button>
            </div>
          )}

        </main>

        {/* Sticky Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'magaza') {
              navigate('/shop');
            } else if (tab === 'klan') {
              navigate('/clan');
            } else {
              setActiveTab(tab);
              setSearchParams({ tab }, { replace: true });
            }
          }}
        />

        {/* RADAR MATCHMAKING MODAL */}
        {matchmakingMode !== null && (
          <MatchmakingModal
            mode={matchmakingMode}
            category={selectedCategory}
            onCancel={() => setMatchmakingMode(null)}
            onMatchFound={(roomCode) => {
              setMatchmakingMode(null);
              navigate(`/lobby/${roomCode}`);
            }}
          />
        )}

        {/* CREATE ROOM MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-[#131631] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👑</span>
                  <h3 className="text-lg font-black text-white">Özel Düello Odası Kur</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div className="bg-rose-500/20 border border-rose-500 text-rose-300 text-xs rounded-xl p-2.5 font-bold">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleCreateRoom} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Oda Başlığı</label>
                  <input
                    type="text"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3.5 py-3 text-white text-xs font-bold focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Kategori</label>
                    <select
                      value={roomCategory}
                      onChange={(e) => setRoomCategory(e.target.value)}
                      className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-3 text-white text-xs font-bold focus:outline-none"
                    >
                      <option value="TYT">TYT</option>
                      <option value="AYT">AYT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Soru Adedi</label>
                    <select
                      value={roomQuestionCount}
                      onChange={(e) => setRoomQuestionCount(Number(e.target.value))}
                      className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-3 text-white text-xs font-bold focus:outline-none"
                    >
                      <option value={3}>3 Soru (Hızlı)</option>
                      <option value={5}>5 Soru (Normal)</option>
                      <option value={10}>10 Soru (Turnuva)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-black/30 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">Oda Ücreti:</span>
                  <span className="font-mono font-black text-amber-400">50 Coin</span>
                </div>

                <button
                  type="submit"
                  disabled={modalLoading || user.coinBalance < 50}
                  className="w-full py-4 rounded-2xl btn-game-gold font-black text-sm uppercase cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Kuruluyor...' : '50 💰 Harca ve Odayı Aç'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* JOIN ROOM MODAL */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-[#131631] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔑</span>
                  <h3 className="text-lg font-black text-white">Lobiye Katıl</h3>
                </div>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div className="bg-rose-500/20 border border-rose-500 text-rose-300 text-xs rounded-xl p-2.5 font-bold">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-300 mb-2 uppercase text-center">
                    4 Haneli Oda Kodunu Gir
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Örn: X8K2"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#1b2046] border-2 border-violet-500 rounded-2xl py-4 text-center text-3xl font-mono font-black tracking-widest text-violet-300 uppercase focus:outline-none"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={modalLoading || joinCode.length < 4}
                  className="w-full py-4 rounded-2xl btn-game-primary font-black text-sm uppercase text-white cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Giriş Yapılıyor...' : 'Odaya Gir →'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* AI COACH REPORT MODAL */}
        <AiCoachReportModal
          isOpen={showAiCoach}
          onClose={() => setShowAiCoach(false)}
        />

        {/* BOT MATCH MODAL */}
        <BotMatchModal
          isOpen={showBotModal}
          onClose={() => setShowBotModal(false)}
        />

      </div>
    </div>
  );
}

