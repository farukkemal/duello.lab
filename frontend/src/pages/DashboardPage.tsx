import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { useViewMode } from '../contexts/ViewModeContext';
import { getSoloExams, type ExamListItem } from '../api/exams';
import { createRoom, joinRoom, createBattleground, type GameMode } from '../api/rooms';
import MobileTopHUD from '../components/MobileTopHUD';
import MobileBottomNav, { type MobileTab } from '../components/MobileBottomNav';
import DesktopNavbar from '../components/DesktopNavbar';
import DesktopArenaView from '../components/desktop/DesktopArenaView';
import ViewModeToggle from '../components/ViewModeToggle';
import MatchmakingModal from '../components/MatchmakingModal';
import AiCoachReportModal from '../components/AiCoachReportModal';
import BotMatchModal from '../components/BotMatchModal';
import InstallPwaBanner from '../components/InstallPwaBanner';
import { getWeaknessReport, type AiCoachReport, type BranchPerformance } from '../api/analytics';
import { isAudioMuted, toggleAudioMute } from '../utils/audio';
import {
  CrossedSwordsGraphic,
  HourglassBombGraphic,
  ClashCrownsGraphic,
  RobotMascotGraphic
} from '../components/ArenaGraphics';


export default function DashboardPage() {
  const { user, logout, refreshUser } = useAuth();
  const { stats } = useSignalR();
  const { isDesktop } = useViewMode();
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
  const [activeRooms] = useState<any[]>([]);
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

  // Profile & Analytics state
  const [profileSubTab, setProfileSubTab] = useState<'analizler' | 'genel' | 'envanter' | 'ayarlar'>('analizler');
  const [aiReport, setAiReport] = useState<AiCoachReport | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [soundMuted, setSoundMuted] = useState(isAudioMuted());

  useEffect(() => {
    getSoloExams()
      .then(({ data }) => setExams(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'profil' && !aiReport && !aiLoading) {
      setAiLoading(true);
      getWeaknessReport()
        .then(({ data }) => setAiReport(data))
        .catch(console.error)
        .finally(() => setAiLoading(false));
    }
  }, [activeTab, aiReport, aiLoading]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060710]">
        <div className="text-violet-400 font-bold text-sm flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Kullanıcı profili yükleniyor...
        </div>
      </div>
    );
  }

  const xpCurrent = (user?.xp ?? 0) % 1000;
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

  // ==========================================
  // DESKTOP (PC) FULL-WIDTH VIEWPORT RENDER
  // ==========================================
  if (isDesktop) {
    return (
      <div className="min-h-screen bg-[#060710] text-slate-100 flex flex-col relative overflow-x-hidden">
        {/* Desktop Navbar */}
        <DesktopNavbar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Desktop Content Area */}
        <main className="flex-1 pb-10">
          {activeTab === 'arena' && (
            <DesktopArenaView
              onStartMatchmaking={setMatchmakingMode}
              onStartBotPractice={() => setShowBotModal(true)}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              selectedCategory={selectedCategory as 'TYT' | 'AYT'}
              activeRooms={activeRooms}
              onOpenCreateLobby={() => setShowCreateModal(true)}
              onOpenJoinCode={() => setShowJoinModal(true)}
              stats={stats}
            />
          )}

          {/* TAB: DÜELLOLAR (DESKTOP) */}
          {activeTab === 'duello' && (
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">⚔️ Canlı Düellolar & Açık Odalar</h2>
                  <p className="text-xs text-slate-400">Özel odalara katıl veya yeni oda kurarak arkadaşlarını davet et</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2.5 rounded-xl btn-game-gold text-slate-950 font-black text-xs uppercase cursor-pointer shadow hover:scale-105 transition"
                  >
                    👑 Özel Lobi Kur
                  </button>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="px-4 py-2.5 rounded-xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer shadow hover:scale-105 transition"
                  >
                    🔑 Koda Katıl
                  </button>
                </div>
              </div>

              {activeRooms.length === 0 ? (
                <div className="game-card-3d p-12 text-center space-y-3">
                  <div className="text-5xl animate-bounce-subtle">📡</div>
                  <h3 className="text-base font-black text-white">Şu Anda Açık Özel Lobi Bulunmuyor</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Kendi özel lobini kurup arkadaşlarını davet edebilir veya Arena sayfasından 1v1 Hızlı Düello eşleşmesine girebilirsin.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 rounded-2xl btn-game-gold font-black text-xs uppercase cursor-pointer shadow-lg mt-2"
                  >
                    + Hemen Lobi Kur
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeRooms.map((r) => (
                    <div key={r.code} className="game-card-3d p-5 space-y-3 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] bg-violet-600/30 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                            {r.category}
                          </span>
                          <h4 className="text-base font-black text-white mt-1.5">{r.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono">Kurucu: {r.creatorUsername}</p>
                        </div>
                        <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-xl">
                          {r.playersCount}/{r.maxPlayers}
                        </span>
                      </div>

                      <button
                        onClick={() => navigate(`/lobby/${r.code}`)}
                        className="w-full py-2.5 rounded-xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer shadow hover:scale-102 transition"
                      >
                        Lobiye Katıl ➔
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PRATİK (DESKTOP) */}
          {activeTab === 'pratik' && (
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">📝 Bireysel Solo Denemeler</h2>
                  <p className="text-xs text-slate-400">Süre kısıtlamalı solo YKS deneme sınavları ile seviyeni test et</p>
                </div>
                <div className="flex bg-[#171b38] p-1 rounded-2xl border border-white/10">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        selectedCategory === c ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 font-bold text-sm">Sınavlar yükleniyor...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredExams.map((exam) => (
                    <div key={exam.id} className="game-card-3d p-5 space-y-3 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full font-bold uppercase">
                          {exam.category}
                        </span>
                        <h4 className="text-base font-black text-white mt-1.5">{exam.title}</h4>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-white/5">
                        <span>❓ {exam.questionCount} Soru</span>
                        <span>⚡ Seviye 1+</span>
                      </div>

                      <button
                        onClick={() => navigate(`/exam/${exam.id}`)}
                        className="w-full py-2.5 rounded-xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer hover:scale-102 transition shadow"
                      >
                        Sınavı Başlat ➔
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PROFİL & ANALİZLER (DESKTOP) */}
          {activeTab === 'profil' && (
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Profile Hero Card */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="game-card-3d p-6 text-center space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[3px] shadow-xl">
                      <div className="w-full h-full bg-[#0d0f22] rounded-[21px] flex items-center justify-center font-black text-white text-3xl">
                        {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-black mb-1">
                        <span>{user?.role === 'Admin' ? '👑 Yönetici' : '⚔️ Savaşçı'}</span>
                      </div>
                      <h2 className="text-2xl font-black text-white">{user?.username || 'Savaşçı'}</h2>
                      <p className="text-xs text-slate-400 font-mono">{user?.email || ''}</p>
                    </div>

                    <div className="space-y-1 bg-black/40 p-3 rounded-2xl border border-white/5">
                      <div className="flex justify-between text-xs font-bold font-mono">
                        <span className="text-slate-400">Seviye {user.level}</span>
                        <span className="text-cyan-400">{xpCurrent} / 1000 XP</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full"
                          style={{ width: `${xpPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                        <div className="text-[10px] text-slate-400 font-bold">🏆 Kupa</div>
                        <div className="text-base font-mono font-black text-amber-300">1,240</div>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                        <div className="text-[10px] text-slate-400 font-bold">💰 Coin</div>
                        <div className="text-base font-mono font-black text-amber-400">{(user?.coinBalance ?? 0).toLocaleString()}</div>
                      </div>
                    </div>

                    <button
                      onClick={logout}
                      className="w-full py-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 font-bold text-xs uppercase cursor-pointer transition"
                    >
                      🚪 Oturumu Kapat
                    </button>
                  </div>

                  {/* Joker Inventory Card in Desktop Profile */}
                  <div className="game-card-3d p-5 text-left space-y-3 bg-gradient-to-b from-[#161a3d] to-[#0f122c] border-amber-400/30">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-white flex items-center gap-2">
                        <span>🎒</span>
                        <span>Düello Jokerlerim</span>
                      </div>
                      <button
                        onClick={() => navigate('/shop')}
                        className="text-[10px] text-amber-300 font-bold hover:underline cursor-pointer"
                      >
                        + Mağaza
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 bg-black/40 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎯</span>
                          <div>
                            <div className="text-xs font-bold text-white">3 Şık Eleme</div>
                            <div className="text-[10px] text-slate-400">3 yanlış şıkkı eler</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-sm text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                          {user?.jokerEliminateThree ?? 0} Adet
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-black/40 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✌️</span>
                          <div>
                            <div className="text-xs font-bold text-white">Çift Cevap Hakkı</div>
                            <div className="text-[10px] text-slate-400">2 şık seçme imkanı</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-sm text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded-lg border border-cyan-400/20">
                          {user?.jokerDoubleChance ?? 0} Adet
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-black/40 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⏳</span>
                          <div>
                            <div className="text-xs font-bold text-white">+15 Sn Ekstra Süre</div>
                            <div className="text-[10px] text-slate-400">Maç sürene 15 sn ekler</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-sm text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20">
                          {user?.jokerExtraTime ?? 0} Adet
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Advice & 8-Branch Heatmap */}
                <div className="lg:col-span-8 space-y-4">
                  {aiReport && (
                    <>
                      <div className="game-card-3d p-5 space-y-3 bg-gradient-to-r from-violet-950/60 to-indigo-950/60 border-violet-500/40">
                        <h3 className="text-sm font-black text-white flex items-center gap-2">
                          <span>🤖</span>
                          <span>AI Sınav Koçu Stratejik Tavsiyeleri</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {aiReport.aiAdviceList.map((adv, i) => (
                            <div key={i} className="bg-black/30 p-3 rounded-xl border border-white/5 text-xs text-slate-200">
                              💡 {adv}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="game-card-3d p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-white">🔥 8 Branş Detaylı Başarı Isı Haritası</h3>
                          <span className="text-xs text-slate-400 font-mono">Net Doğruluk Oranı</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiReport.branchHeatmap.map((bp: BranchPerformance) => (
                            <div key={bp.branch} className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-white">{bp.branch}</span>
                                <span className="text-xs font-mono font-black text-cyan-400">%{bp.accuracyRate} Başarı</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    bp.accuracyRate >= 70
                                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                                      : bp.accuracyRate >= 45
                                      ? 'bg-amber-400'
                                      : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                                  }`}
                                  style={{ width: `${Math.max(5, bp.accuracyRate)}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-slate-300 leading-snug">{bp.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            </div>
          )}
        </main>

        {/* Global Matchmaking Modal */}
        {matchmakingMode !== null && (
          <MatchmakingModal
            mode={matchmakingMode}
            category={selectedCategory}
            onCancel={() => setMatchmakingMode(null)}
            onMatchFound={(roomCode) => navigate(`/lobby/${roomCode}`)}
          />
        )}

        {/* Modals */}
        <AiCoachReportModal isOpen={showAiCoach} onClose={() => setShowAiCoach(false)} />
        <BotMatchModal isOpen={showBotModal} onClose={() => setShowBotModal(false)} />

        {/* CREATE ROOM MODAL (DESKTOP) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-[#131631] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👑</span>
                  <h3 className="text-lg font-black text-white">Özel Lobi Kur</h3>
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

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Oda Adı</label>
                  <input
                    type="text"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Kategori</label>
                    <select
                      value={roomCategory}
                      onChange={(e) => setRoomCategory(e.target.value)}
                      className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold focus:outline-none"
                    >
                      <option value="TYT">TYT</option>
                      <option value="AYT">AYT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Soru Sayısı</label>
                    <select
                      value={roomQuestionCount}
                      onChange={(e) => setRoomQuestionCount(Number(e.target.value))}
                      className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold focus:outline-none"
                    >
                      <option value={3}>3 Soru (Hızlı)</option>
                      <option value={5}>5 Soru (Normal)</option>
                      <option value={10}>10 Soru (Turnuva)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full py-3.5 rounded-2xl btn-game-gold font-black text-xs uppercase cursor-pointer"
                >
                  {modalLoading ? 'Kuruluyor...' : 'Odayı Aç ➔'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* JOIN ROOM MODAL (DESKTOP) */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-[#131631] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
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
                  className="w-full py-3.5 rounded-2xl btn-game-primary font-black text-xs uppercase text-white cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Giriş Yapılıyor...' : 'Odaya Gir →'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // MOBILE APP SHELL RENDER
  // ==========================================
  return (
    <div className="h-screen h-[100dvh] bg-[#060710] flex justify-center overflow-hidden relative">
      {/* Floating View Mode Switcher */}
      <ViewModeToggle isFloating />

      <div className="w-full max-w-md mobile-app-shell flex flex-col relative overflow-hidden">
        
        {/* Top Game HUD Bar */}
        <MobileTopHUD onOpenProfile={() => setActiveTab('profil')} />

        {/* Dynamic Mobile Game Screen Content */}
        <main className="flex-1 px-3 py-2.5 overflow-y-auto no-scrollbar flex flex-col">
          
          {/* PWA Install Banner */}
          <InstallPwaBanner />

          {/* TAB 1: ARENA (MATCHING USER DESIGN SCREENSHOT) */}
          {activeTab === 'arena' && (
            <div className="h-full flex flex-col justify-between gap-2 animate-fadeIn pb-0.5">
              
              {/* 1. TOP HEADER TOOLBAR: Category Switcher + Quest Bar + AI Coach */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Category Segmented Toggle */}
                <div className="flex bg-[#0f122c] p-0.5 rounded-xl border border-white/10 shrink-0">
                  {['TYT', 'AYT'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Daily Quest Card with Cyan Glowing Progress Bar */}
                <div className="flex-1 min-w-0 bg-[#0f122c] border border-white/10 rounded-xl px-2.5 py-1 flex flex-col justify-center shadow-sm">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs">🎯</span>
                      <span className="text-[10px] font-bold text-white truncate">1 Düello Kazan</span>
                    </div>
                    <span className="text-[10px] font-mono font-black text-amber-300 shrink-0">+100 💰</span>
                  </div>
                  {/* Glowing progress line */}
                  <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full w-3/4 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  </div>
                </div>

                {/* AI Coach Button */}
                <button
                  onClick={() => setShowAiCoach(true)}
                  className="bg-[#211347] hover:bg-[#2c1a5e] border border-purple-500/50 rounded-xl px-2.5 py-1.5 flex items-center gap-1 text-[10px] font-black text-purple-200 shrink-0 cursor-pointer shadow-sm active:scale-95 transition-transform"
                  title="Zayıf Nokta Isı Haritası"
                >
                  <span>🧠</span>
                  <span>AI Koç</span>
                </button>
              </div>

              {/* 2. HERO FEATURED: BATTLEGROUND TURNUVASI */}
              <div className="bg-gradient-to-r from-[#320815] via-[#240a24] to-[#0f122c] border-2 border-rose-600/70 rounded-2xl p-2.5 sm:p-3 relative overflow-hidden shadow-[0_0_15px_rgba(225,29,72,0.25)] flex items-center justify-between gap-2.5 shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-600 to-red-600 flex items-center justify-center text-xl sm:text-2xl shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.6)] border border-rose-300/40 animate-pulse">
                    🔥
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-rose-600 text-white font-black text-[8px] px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                        CANLI
                      </span>
                      <span className="text-[10px] font-bold text-rose-300 font-mono">180 Oyuncu</span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-black bg-gradient-to-r from-yellow-300 via-amber-300 to-rose-300 bg-clip-text text-transparent uppercase tracking-tight leading-tight truncate">
                      BATTLEGROUND TURNUVASI
                    </h3>
                    <p className="text-[9px] text-slate-300 truncate">
                      3 soruda alan daralır, en iyi 3 kazanır!
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleStartBattleground}
                  disabled={modalLoading}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 hover:from-amber-300 hover:to-rose-500 border-b-3 border-rose-900 font-black text-[10px] sm:text-xs uppercase tracking-wider text-white shadow-lg cursor-pointer active:translate-y-0.5 active:border-b-0 transition-all shrink-0 whitespace-nowrap"
                >
                  {modalLoading ? '...' : '🏆 KATIL ➔'}
                </button>
              </div>

              {/* 3. GAME MODES 2x2 GRID (PIXEL-PERFECT FROM SCREENSHOT) */}
              <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
                
                {/* CARD 1: 1v1 Hızlı Düello */}
                <div className="bg-gradient-to-b from-[#141738] to-[#0c0e24] border border-[#2d3166] hover:border-violet-500/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between relative shadow-xl transition-all group">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-xl bg-[#281b52] border border-violet-500/40 flex items-center justify-center text-violet-300 text-xs shadow-inner">
                      ⚡
                    </div>
                    <span className="bg-[#1c1f4a] border border-indigo-500/40 text-indigo-300 text-[8px] font-black px-2 py-0.5 rounded-full">
                      Dereceli
                    </span>
                  </div>

                  {/* Center Illustration */}
                  <CrossedSwordsGraphic />

                  {/* Info Text */}
                  <div className="text-left space-y-0.5">
                    <h4 className="text-xs font-black text-white leading-tight">1v1 Hızlı Düello</h4>
                    <p className="text-[9px] text-slate-400">3s eşleşme • +30 Kupa</p>
                    <div className="inline-block bg-[#090b1c] px-2 py-0.5 rounded-md border border-white/5 text-[9px] font-bold text-slate-300 font-mono mt-0.5">
                      Geçmiş G/M: <span className="text-amber-400 font-black">3/1</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setMatchmakingMode(1)}
                    className="w-full mt-2 py-2 rounded-xl bg-gradient-to-b from-[#9061f9] to-[#6d28d9] border-b-3 border-[#4c1d95] text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider shadow-lg cursor-pointer active:translate-y-0.5 active:border-b-0 transition-all flex items-center justify-center gap-1"
                  >
                    <span>⚡</span> <span>1V1 OYNA</span>
                  </button>
                </div>

                {/* CARD 2: Ani Ölüm (Sudden Death) */}
                <div className="bg-gradient-to-b from-[#141738] to-[#0c0e24] border border-[#2d3166] hover:border-rose-500/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between relative shadow-xl transition-all group">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-xl bg-[#441224] border border-rose-500/40 flex items-center justify-center text-rose-300 text-xs shadow-inner">
                      ⏱️
                    </div>
                    <span className="bg-[#381024] border border-rose-500/40 text-rose-300 text-[8px] font-black px-2 py-0.5 rounded-full">
                      Turbo
                    </span>
                  </div>

                  {/* Center Illustration */}
                  <HourglassBombGraphic />

                  {/* Info Text */}
                  <div className="text-left space-y-0.5">
                    <h4 className="text-xs font-black text-white leading-tight">Ani Ölüm</h4>
                    <p className="text-[9px] text-slate-400">15s süre • 1 hata = son</p>
                    <div className="inline-block bg-[#090b1c] px-2 py-0.5 rounded-md border border-white/5 text-[9px] font-bold text-slate-300 font-mono mt-0.5">
                      Rekor Süre: <span className="text-cyan-300 font-black">14s</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setMatchmakingMode(3)}
                    className="w-full mt-2 py-2 rounded-xl bg-gradient-to-b from-[#f43f5e] via-[#e11d48] to-[#be123c] border-b-3 border-[#881337] text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider shadow-lg cursor-pointer active:translate-y-0.5 active:border-b-0 transition-all flex items-center justify-center gap-1"
                  >
                    <span>⏱️</span> <span>BAŞLA</span>
                  </button>
                </div>

                {/* CARD 3: 2v2 Takım (Squad) */}
                <div className="bg-gradient-to-b from-[#141738] to-[#0c0e24] border border-[#2d3166] hover:border-cyan-500/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between relative shadow-xl transition-all group">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-xl bg-[#0e3347] border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs shadow-inner">
                      👑
                    </div>
                    <span className="bg-[#0c2838] border border-cyan-500/40 text-cyan-300 text-[8px] font-black px-2 py-0.5 rounded-full">
                      Takım
                    </span>
                  </div>

                  {/* Center Illustration */}
                  <ClashCrownsGraphic />

                  {/* Info Text */}
                  <div className="text-left space-y-0.5">
                    <h4 className="text-xs font-black text-white leading-tight">2v2 Takım</h4>
                    <p className="text-[9px] text-slate-400">Kırmızı vs Mavi puanı</p>
                    <div className="inline-block bg-[#090b1c] px-2 py-0.5 rounded-md border border-white/5 text-[9px] font-bold text-slate-300 font-mono mt-0.5">
                      Liderlik Sırası: <span className="text-amber-400 font-black">#7</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setMatchmakingMode(4)}
                    className="w-full mt-2 py-2 rounded-xl bg-gradient-to-b from-[#22d3ee] to-[#0891b2] border-b-3 border-[#155e75] text-slate-950 font-black text-[10px] sm:text-[11px] uppercase tracking-wider shadow-lg cursor-pointer active:translate-y-0.5 active:border-b-0 transition-all flex items-center justify-center gap-1"
                  >
                    <span>👥</span> <span>2v2 EŞLEŞ</span>
                  </button>
                </div>

                {/* CARD 4: Bot Pratik */}
                <div className="bg-gradient-to-b from-[#141738] to-[#0c0e24] border border-[#2d3166] hover:border-emerald-500/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between relative shadow-xl transition-all group">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-xl bg-[#0c3829] border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs shadow-inner">
                      🤖
                    </div>
                    <span className="bg-[#0c3328] border border-emerald-500/40 text-emerald-300 text-[8px] font-black px-2 py-0.5 rounded-full">
                      Pratik
                    </span>
                  </div>

                  {/* Center Illustration */}
                  <RobotMascotGraphic />

                  {/* Info Text */}
                  <div className="text-left space-y-0.5">
                    <h4 className="text-xs font-black text-white leading-tight">Bot Pratik</h4>
                    <p className="text-[9px] text-slate-400">YKS botlarıyla antrenman</p>
                    <div className="inline-block bg-[#090b1c] px-2 py-0.5 rounded-md border border-white/5 text-[9px] font-bold text-slate-300 font-mono mt-0.5">
                      Yüksek Puan: <span className="text-amber-400 font-black">880</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setShowBotModal(true)}
                    className="w-full mt-2 py-2 rounded-xl bg-gradient-to-b from-[#34d399] to-[#059669] border-b-3 border-[#047857] text-slate-950 font-black text-[10px] sm:text-[11px] uppercase tracking-wider shadow-lg cursor-pointer active:translate-y-0.5 active:border-b-0 transition-all flex items-center justify-center gap-1"
                  >
                    <span>🤖</span> <span>ANTRENMAN</span>
                  </button>
                </div>

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
                    { emoji: '💎', name: 'Serra',  sub: '100\'üncüsü',      color: 'bg-violet-900/60' },
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

              {loading ? (
                <div className="py-8 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  Sınavlar yükleniyor...
                </div>
              ) : (
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
              )}
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

          {/* TAB 5: PROFIL & DERİN ANALİZLER */}
          {activeTab === 'profil' && (
            <div className="space-y-3.5 animate-fadeIn pb-4">
              
              {/* 1. HERO PROFILE CARD */}
              <div className="bg-gradient-to-b from-[#161a3d] to-[#0d0f26] border-2 border-violet-500/30 rounded-3xl p-4 sm:p-5 text-center relative overflow-hidden shadow-2xl space-y-3">
                <div className="absolute top-0 right-0 w-36 h-36 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <span className="inline-block bg-violet-500/20 text-violet-300 border border-violet-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase mb-1">
                      {user.role === 'Admin' ? '👑 Yönetici' : '⚔️ Savaşçı'}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white leading-tight flex items-center gap-1.5">
                      <span>{user.username}</span>
                      <span className="text-emerald-400 text-xs" title="Doğrulanmış Hesap">✓</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">{user.email}</p>
                  </div>

                  {/* 3D Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[2px] shadow-lg">
                      <div className="w-full h-full bg-[#0d0f22] rounded-[14px] flex items-center justify-center text-2xl font-black text-white font-mono">
                        {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full border-2 border-[#0d0f26] shadow">
                      Lv.{user?.level ?? 1}
                    </div>
                  </div>
                </div>

                {/* Level Progress Bar */}
                <div className="bg-[#090b1c]/90 rounded-2xl p-2.5 border border-white/5 text-left space-y-1.5">
                  <div className="flex justify-between text-[11px] font-black">
                    <span className="text-slate-300 flex items-center gap-1">
                      <span>⭐ Seviye {user.level}</span>
                    </span>
                    <span className="text-violet-400 font-mono">{xpCurrent} / 1000 XP</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden p-[0.5px]">
                    <div
                      className="bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>İlerleme: %{xpPercent}</span>
                    <span>Sonraki seviyeye {xpLeft} XP</span>
                  </div>
                </div>

                {/* Quick 4 Metrics Grid */}
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  <div className="bg-[#10132b] border border-white/5 rounded-xl p-2 text-center">
                    <div className="text-sm mb-0.5">🏆</div>
                    <div className="text-[9px] text-slate-400 font-bold">Kupa</div>
                    <div className="text-[11px] font-mono font-black text-amber-300">{Math.floor((user?.xp ?? 0) / 10)}</div>
                  </div>
                  <div className="bg-[#10132b] border border-white/5 rounded-xl p-2 text-center">
                    <div className="text-sm mb-0.5">💰</div>
                    <div className="text-[9px] text-slate-400 font-bold">Coin</div>
                    <div className="text-[11px] font-mono font-black text-amber-400">{(user?.coinBalance ?? 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-[#10132b] border border-white/5 rounded-xl p-2 text-center">
                    <div className="text-sm mb-0.5">🎯</div>
                    <div className="text-[9px] text-slate-400 font-bold">Başarı</div>
                    <div className="text-[11px] font-mono font-black text-emerald-400">%{aiReport?.overallAccuracyRate ?? 78}</div>
                  </div>
                  <div className="bg-[#10132b] border border-white/5 rounded-xl p-2 text-center">
                    <div className="text-sm mb-0.5">⚡</div>
                    <div className="text-[9px] text-slate-400 font-bold">Soru</div>
                    <div className="text-[11px] font-mono font-black text-cyan-400">{aiReport?.totalQuestionsSolved ?? Math.floor((user?.xp ?? 0) / 20)}</div>
                  </div>
                </div>
              </div>

              {/* 2. PROFILE SUB-TABS NAVIGATION */}
              <div className="flex bg-[#0f122c] p-1 rounded-2xl border border-white/10 gap-1 shadow-inner">
                <button
                  onClick={() => setProfileSubTab('analizler')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    profileSubTab === 'analizler'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🧠</span> <span>AI</span>
                </button>
                <button
                  onClick={() => setProfileSubTab('envanter')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    profileSubTab === 'envanter'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🎒</span> <span>Envanter</span>
                </button>
                <button
                  onClick={() => setProfileSubTab('genel')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    profileSubTab === 'genel'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>📊</span> <span>Genel</span>
                </button>
                <button
                  onClick={() => setProfileSubTab('ayarlar')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    profileSubTab === 'ayarlar'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>⚙️</span> <span>Ayar</span>
                </button>
              </div>

              {/* 3. SUB-TAB CONTENT: ANALİZLER (AI HEATMAP & WEAKNESS BREAKDOWN) */}
              {profileSubTab === 'analizler' && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {aiLoading ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      Yapay zeka analizleri derleniyor...
                    </div>
                  ) : aiReport && (
                    <>
                      {/* Strength & Weakness Callouts */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3 flex items-center gap-2.5 shadow-md">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
                            🛡️
                          </div>
                          <div className="min-w-0">
                            <div className="text-[9px] text-emerald-400 font-bold uppercase">En Güçlü Branş</div>
                            <div className="text-xs font-black text-white truncate">{aiReport.strongestBranch}</div>
                          </div>
                        </div>

                        <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-3 flex items-center gap-2.5 shadow-md">
                          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-lg shrink-0">
                            🎯
                          </div>
                          <div className="min-w-0">
                            <div className="text-[9px] text-rose-400 font-bold uppercase">Geliştirilmeli</div>
                            <div className="text-xs font-black text-white truncate">{aiReport.weakestBranch}</div>
                          </div>
                        </div>
                      </div>

                      {/* AI Coach Personal Strategy Box */}
                      <div className="bg-gradient-to-r from-violet-950/70 via-purple-950/60 to-indigo-950/70 border-2 border-violet-500/40 rounded-2xl p-3.5 space-y-2 shadow-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-black text-violet-300 uppercase">
                            <span>🤖 AI Sınav Koçu Tavsiyeleri</span>
                          </div>
                          <span className="text-[9px] bg-violet-500/30 text-violet-200 border border-violet-400/40 px-2 py-0.5 rounded-full font-bold">
                            KİŞİSEL
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {aiReport.aiAdviceList.map((advice, idx) => (
                            <div key={idx} className="text-[11px] text-slate-200 font-medium leading-snug flex items-start gap-1.5">
                              <span className="text-violet-400 text-xs shrink-0">•</span>
                              <span>{advice}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-1.5 flex items-center justify-between text-[10px] bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/5">
                          <span className="text-slate-400 font-bold">🎯 Önerilen Günlük Mod:</span>
                          <span className="font-black text-amber-300 font-mono">{aiReport.dailyRecommendedMode}</span>
                        </div>
                      </div>

                      {/* Branch Weakness Heatmap Cards */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-black px-1">
                          <span className="text-white flex items-center gap-1">
                            <span>🔥</span> <span>Ders & Branş Isı Haritası</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Net Başarısı</span>
                        </div>

                        <div className="space-y-2">
                          {aiReport.branchHeatmap.map((branch) => {
                            const isMastered = branch.masteryLevel === 'Mastered';
                            const isNeedsWork = branch.masteryLevel === 'NeedsWork';

                            return (
                              <div
                                key={branch.branch}
                                className="bg-[#121533] border border-white/10 hover:border-violet-500/50 rounded-2xl p-3 space-y-2 transition-all shadow-md"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">
                                      {branch.branch === 'Matematik' || branch.branch === 'Geometri' ? '📐' :
                                       branch.branch === 'Türkçe' ? '📖' :
                                       branch.branch === 'Fizik' ? '⚡' :
                                       branch.branch === 'Kimya' ? '🧪' :
                                       branch.branch === 'Biyoloji' ? '🧬' :
                                       branch.branch === 'Tarih' ? '🏛️' : '🌍'}
                                    </span>
                                    <div>
                                      <h4 className="text-xs font-black text-white">{branch.branch}</h4>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        {branch.correctCount} Doğru • {branch.wrongCount} Yanlış
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span
                                      className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                        isMastered
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                          : isNeedsWork
                                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      }`}
                                    >
                                      {isMastered ? '👑 Usta' : isNeedsWork ? '⚡ Geliştirilmeli' : '⚠️ Kritik'}
                                    </span>
                                    <div className="text-xs font-mono font-black text-white mt-0.5">
                                      %{branch.accuracyRate}
                                    </div>
                                  </div>
                                </div>

                                {/* Custom Colored Progress Bar */}
                                <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden p-[0.5px]">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isMastered
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                        : isNeedsWork
                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                        : 'bg-gradient-to-r from-rose-600 to-pink-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                    }`}
                                    style={{ width: `${Math.max(8, branch.accuracyRate)}%` }}
                                  />
                                </div>

                                <p className="text-[10px] text-slate-300 bg-black/25 px-2.5 py-1 rounded-xl border border-white/5">
                                  💡 {branch.recommendation}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* SUB-TAB CONTENT: ENVANTER & JOKERLER */}
              {profileSubTab === 'envanter' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="bg-[#121533] border border-amber-400/30 rounded-2xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>🎒</span> <span>Düello Jokerlerim</span>
                      </div>
                      <button
                        onClick={() => navigate('/shop')}
                        className="text-[10px] text-amber-300 font-bold bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-lg active:scale-95 transition"
                      >
                        + Mağazadan Al
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">🎯</span>
                          <div className="text-left">
                            <div className="text-xs font-bold text-white">3 Şık Eleme Jokeri</div>
                            <div className="text-[10px] text-slate-400">3 yanlış şıkkı eler</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-xs text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                          {user?.jokerEliminateThree ?? 0} Adet
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">✌️</span>
                          <div className="text-left">
                            <div className="text-xs font-bold text-white">Çift Cevap Hakkı</div>
                            <div className="text-[10px] text-slate-400">2 şık seçme imkanı</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-xs text-cyan-300 bg-cyan-400/10 px-2.5 py-1 rounded-lg border border-cyan-400/20">
                          {user?.jokerDoubleChance ?? 0} Adet
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">⏳</span>
                          <div className="text-left">
                            <div className="text-xs font-bold text-white">+15 Sn Ekstra Süre</div>
                            <div className="text-[10px] text-slate-400">Maç sürene 15 sn ekler</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-xs text-emerald-300 bg-emerald-400/10 px-2.5 py-1 rounded-lg border border-emerald-400/20">
                          {user?.jokerExtraTime ?? 0} Adet
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. SUB-TAB CONTENT: GENEL BAKIŞ */}
              {profileSubTab === 'genel' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#121533] border border-white/10 rounded-2xl p-3.5 text-center">
                      <div className="text-2xl mb-1">👑</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Kazanılan Düello</div>
                      <div className="text-lg font-mono font-black text-amber-400 mt-0.5">
                        {Math.floor(user.xp / 45)} Zafer
                      </div>
                    </div>
                    <div className="bg-[#121533] border border-white/10 rounded-2xl p-3.5 text-center">
                      <div className="text-2xl mb-1">🔥</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">En İyi Seri</div>
                      <div className="text-lg font-mono font-black text-rose-400 mt-0.5">
                        5 Galibiyet
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#121533] border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>🎖️</span> <span>Kazanılan Başarımlar</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="bg-black/30 border border-amber-500/30 rounded-xl p-2 text-center">
                        <div className="text-xl">🏆</div>
                        <div className="text-[9px] font-bold text-amber-300 mt-1">İlk Zafer</div>
                        <div className="text-[8px] text-slate-400">Tamamlandı</div>
                      </div>
                      <div className="bg-black/30 border border-violet-500/30 rounded-xl p-2 text-center">
                        <div className="text-xl">⚡</div>
                        <div className="text-[9px] font-bold text-violet-300 mt-1">Hızlı Seri</div>
                        <div className="text-[8px] text-slate-400">Tamamlandı</div>
                      </div>
                      <div className="bg-black/30 border border-cyan-500/30 rounded-xl p-2 text-center">
                        <div className="text-xl">🎓</div>
                        <div className="text-[9px] font-bold text-cyan-300 mt-1">YKS Çözer</div>
                        <div className="text-[8px] text-slate-400">Seviye 1</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. SUB-TAB CONTENT: AYARLAR */}
              {profileSubTab === 'ayarlar' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="bg-[#121533] border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-black text-white uppercase tracking-wider">
                      Oyun ve Ses Ayarları
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{soundMuted ? '🔇' : '🔊'}</span>
                        <div>
                          <div className="text-xs font-black text-white">Ses Efektleri</div>
                          <div className="text-[10px] text-slate-400">Oyun içi sesler ve alkışlar</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newMuted = toggleAudioMute();
                          setSoundMuted(newMuted);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          soundMuted
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-emerald-600 text-white shadow-lg'
                        }`}
                      >
                        {soundMuted ? 'KAPALI' : 'AÇIK'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔔</span>
                        <div>
                          <div className="text-xs font-black text-white">Anlık Bildirimler</div>
                          <div className="text-[10px] text-slate-400">Düello davetleri ve ödül uyarıları</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-black">AKTİF</span>
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 border-b-3 border-rose-900 text-white hover:from-rose-500 hover:to-red-500 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg active:translate-y-0.5 active:border-b-0"
                  >
                    🚪 Oturumu Kapat
                  </button>
                </div>
              )}

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

