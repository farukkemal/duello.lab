import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { getSoloExams, type ExamListItem } from '../api/exams';
import { createRoom, joinRoom, claimCoins } from '../api/rooms';
import LiveStatusBadge from '../components/LiveStatusBadge';

export default function DashboardPage() {
  const { user, logout, refreshUser } = useAuth();
  const { stats, status } = useSignalR();
  const navigate = useNavigate();

  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomTitle, setRoomTitle] = useState('Hızlı Düello');
  const [roomCategory, setRoomCategory] = useState('TYT');
  const [roomQuestionCount, setRoomQuestionCount] = useState(5);
  const [joinCode, setJoinCode] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [claimingCoins, setClaimingCoins] = useState(false);

  useEffect(() => {
    getSoloExams()
      .then(({ data }) => setExams(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const xpForCurrentLevel = user.xp % 1000;
  const xpProgress = (xpForCurrentLevel / 1000) * 100;

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

  const handleClaimCoins = async () => {
    setClaimingCoins(true);
    try {
      await claimCoins();
      await refreshUser();
    } catch (err) {
      console.error('Claim coins error:', err);
    } finally {
      setClaimingCoins(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-surface-light)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[var(--color-primary)]">duello.lab</h1>
            <LiveStatusBadge />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[var(--color-text-muted)]">{user.username}</span>
            <button
              onClick={logout}
              className="text-sm text-[var(--color-danger)] hover:underline"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Top Quick Actions Bar (FAZ 2.2 Multiplayer) */}
        <div className="bg-gradient-to-r from-[var(--color-primary)]/20 via-[var(--color-surface)] to-[var(--color-surface)] border border-[var(--color-primary)]/30 rounded-3xl p-6 mb-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider mb-2">
              <span>⚔️ Çok Oyunculu Arena</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white">Arkadaşlarınla Canlı Düello Yap</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Özel bir lobi kurarak 4 haneli kodla arkadaşlarını davet et veya mevcut bir odaya katıl!
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setModalError(null);
                setShowCreateModal(true);
              }}
              className="flex-1 md:flex-none px-6 py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>👑 Oda Kur</span>
              <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full font-mono">50 💰</span>
            </button>

            <button
              onClick={() => {
                setModalError(null);
                setShowJoinModal(true);
              }}
              className="flex-1 md:flex-none px-6 py-3.5 bg-[var(--color-surface-light)] hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🔑 Koda Göre Katıl</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {/* Level Card */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-surface-light)]">
            <div className="text-[var(--color-text-muted)] text-sm mb-1">Seviye</div>
            <div className="text-4xl font-bold text-[var(--color-primary)]">{user.level}</div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                <span>{xpForCurrentLevel} XP</span>
                <span>1000 XP</span>
              </div>
              <div className="w-full bg-[var(--color-surface-light)] rounded-full h-3">
                <div
                  className="bg-[var(--color-primary)] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* XP Card */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-surface-light)]">
            <div className="text-[var(--color-text-muted)] text-sm mb-1">Toplam XP</div>
            <div className="text-4xl font-bold text-[var(--color-accent)]">{user.xp.toLocaleString()}</div>
            <div className="text-[var(--color-text-muted)] text-sm mt-2">Sıradaki seviye: {(user.level * 1000) - user.xp} XP kaldı</div>
          </div>

          {/* Coin Card with Claim Button */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-surface-light)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)] text-sm">Coin Bakiye</span>
                <button
                  onClick={handleClaimCoins}
                  disabled={claimingCoins}
                  title="Test amaçlı 100 Coin ekle"
                  className="text-xs bg-[var(--color-warning)]/20 hover:bg-[var(--color-warning)]/30 text-[var(--color-warning)] font-bold px-2 py-1 rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {claimingCoins ? '...' : '+100 💰'}
                </button>
              </div>
              <div className="text-4xl font-bold text-[var(--color-warning)] mt-1">{user.coinBalance}</div>
            </div>
            <div className="text-[var(--color-text-muted)] text-xs mt-3">
              Oda kurmak: 50 Coin
            </div>
          </div>

          {/* Real-time Network Card */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-primary)]/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[var(--color-text-muted)] text-sm">Canlı Sunucu</span>
              <span className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <div className="text-4xl font-bold text-emerald-400">
              {stats?.onlineUsersCount ?? 1} <span className="text-sm font-normal text-[var(--color-text-muted)]">Çevrimiçi</span>
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-2 flex items-center justify-between">
              <span>Aktif Odalar: {stats?.activeRoomsCount ?? 0}</span>
              <span className="font-mono">{stats?.isRedisActive ? '⚡ Redis' : '🧠 In-Memory'}</span>
            </div>
          </div>
        </div>

        {/* Solo Exams Section */}
        <h2 className="text-xl font-semibold mb-4">📝 Solo Pratik Sınavları</h2>
        {loading ? (
          <div className="text-center text-[var(--color-text-muted)] py-12">Yükleniyor...</div>
        ) : exams.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-2xl p-12 text-center border border-[var(--color-surface-light)]">
            <p className="text-[var(--color-text-muted)] text-lg">Henüz solo sınav eklenmemiş.</p>
            <p className="text-[var(--color-text-muted)] text-sm mt-2">Admin panelinden sınav import edin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-[var(--color-surface)] rounded-2xl p-6 hover:bg-[var(--color-surface-light)] transition cursor-pointer group border border-[var(--color-surface-light)]"
                onClick={() => navigate(`/exam/${exam.id}`)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-semibold px-3 py-1 rounded-full">
                    {exam.category}
                  </span>
                  <span className="text-[var(--color-text-muted)] text-sm">{exam.questionCount} soru</span>
                </div>
                <h3 className="text-lg font-semibold group-hover:text-[var(--color-primary)] transition">{exam.title}</h3>
                <button className="mt-4 w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white py-2 rounded-lg text-sm font-medium transition cursor-pointer">
                  Sınava Başla →
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-surface-light)] rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 text-[var(--color-text-muted)] hover:text-white text-xl cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold mb-1">👑 Özel Lobi Kur</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Oda kurarak 4 haneli kod ile arkadaşlarını davet edebilirsin.
            </p>

            {modalError && (
              <div className="bg-[var(--color-danger)]/20 border border-[var(--color-danger)] text-[var(--color-danger)] text-xs rounded-xl p-3 mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">Lobi Başlığı</label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  className="w-full bg-[var(--color-surface-light)] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">Kategori</label>
                  <select
                    value={roomCategory}
                    onChange={(e) => setRoomCategory(e.target.value)}
                    className="w-full bg-[var(--color-surface-light)] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition text-sm cursor-pointer"
                  >
                    <option value="TYT">TYT</option>
                    <option value="AYT">AYT</option>
                    <option value="Genel">Genel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">Soru Sayısı</label>
                  <select
                    value={roomQuestionCount}
                    onChange={(e) => setRoomQuestionCount(Number(e.target.value))}
                    className="w-full bg-[var(--color-surface-light)] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition text-sm cursor-pointer"
                  >
                    <option value={3}>3 Soru</option>
                    <option value={5}>5 Soru</option>
                    <option value={10}>10 Soru</option>
                  </select>
                </div>
              </div>

              <div className="bg-[var(--color-surface-light)] rounded-xl p-4 flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">Oda Kurma Ücreti:</span>
                <span className="font-bold text-[var(--color-warning)]">50 Coin</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-[var(--color-surface-light)] hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || user.coinBalance < 50}
                  className="flex-1 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {modalLoading ? 'Kuruluyor...' : '50 💰 Harca & Kur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN ROOM MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-surface-light)] rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-6 right-6 text-[var(--color-text-muted)] hover:text-white text-xl cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold mb-1">🔑 Lobiye Katıl</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Arkadaşının paylaştığı 4 haneli oda kodunu girerek odaya katıl.
            </p>

            {modalError && (
              <div className="bg-[var(--color-danger)]/20 border border-[var(--color-danger)] text-[var(--color-danger)] text-xs rounded-xl p-3 mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">4 Haneli Oda Kodu</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Örn: A7B2"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-[var(--color-surface-light)] border border-white/5 rounded-xl px-4 py-4 text-center text-3xl font-mono font-bold tracking-widest text-[var(--color-primary)] uppercase focus:outline-none focus:border-[var(--color-primary)] transition"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 px-4 py-3 bg-[var(--color-surface-light)] hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || joinCode.length < 4}
                  className="flex-1 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {modalLoading ? 'Katılınıyor...' : 'Odaya Katıl →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
