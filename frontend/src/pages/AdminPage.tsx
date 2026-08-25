import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getAdminStats, getAdminUsers, updateUserEconomy, updateUserRole, banUser,
  getAdminQuestions, createAdminQuestion, updateAdminQuestion, deleteAdminQuestion, getAdminExams,
  getAdminRooms, terminateRoom,
  type AdminStats, type AdminUser, type AdminQuestion, type AdminRoom, type AdminExamRef
} from '../api/admin';

type Tab = 'overview' | 'questions' | 'users' | 'rooms';

// ─── helpers ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-1">
      <div className="text-2xl">{icon}</div>
      <div className="text-3xl font-bold text-[var(--color-text)]">{typeof value === 'number' ? (value ?? 0).toLocaleString() : (value || '0')}</div>
      <div className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</div>
      {sub && <div className="text-xs text-[var(--color-text-muted)]">{sub}</div>}
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(r => { setStats(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="text-[var(--color-text-muted)] py-10 text-center">Yükleniyor...</div>;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard icon="👥" label="Toplam Kullanıcı" value={stats.totalUsers} />
      <StatCard icon="❓" label="Toplam Soru" value={stats.totalQuestions} />
      <StatCard icon="📚" label="Sınav Sayısı" value={stats.totalExams} />
      <StatCard icon="⚔️" label="Aktif Oda" value={stats.activeRooms} />
      <StatCard icon="🪙" label="Toplam Coin" value={stats.totalCoinsInCirculation} />
      <StatCard icon="🚫" label="Banlı Kullanıcı" value={stats.bannedUsers} />
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Economy modal
  const [econModal, setEconModal] = useState<AdminUser | null>(null);
  const [deltaXP, setDeltaXP] = useState('0');
  const [deltaCoin, setDeltaCoin] = useState('0');
  const [setLvl, setSetLvl] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAdminUsers({ search, page, pageSize: 15 });
      setUsers(data.users);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openEcon = (u: AdminUser) => {
    setEconModal(u);
    setDeltaXP('0');
    setDeltaCoin('0');
    setSetLvl('');
    setMsg('');
  };

  const saveEcon = async () => {
    if (!econModal) return;
    setSaving(true);
    try {
      await updateUserEconomy(econModal.id, {
        deltaXP: parseInt(deltaXP) || 0,
        deltaCoin: parseInt(deltaCoin) || 0,
        setLevel: setLvl ? parseInt(setLvl) : undefined
      });
      setMsg('✅ Kaydedildi!');
      fetchUsers();
    } catch {
      setMsg('❌ Hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = async (u: AdminUser) => {
    const newRole = u.role === 'Admin' ? 'User' : 'Admin';
    await updateUserRole(u.id, newRole);
    fetchUsers();
  };

  const toggleBan = async (u: AdminUser) => {
    await banUser(u.id, !u.isBanned);
    fetchUsers();
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="flex gap-3">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Kullanıcı ara (isim, email, ID)..."
          className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2 text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] text-left">
            <tr>
              <th className="px-4 py-3">Kullanıcı</th>
              <th className="px-4 py-3">Seviye</th>
              <th className="px-4 py-3">XP</th>
              <th className="px-4 py-3">Coin</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} className="text-center py-8 text-[var(--color-text-muted)]">Yükleniyor...</td></tr>
              : users.map(u => (
                <tr key={u.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[var(--color-text)]">{u.username}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{u.level ?? 1}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{(u?.xp ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{(u?.coinBalance ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === 'Admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                      {u.role === 'Admin' ? '👑 Admin' : '👤 Kullanıcı'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.isBanned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {u.isBanned ? '🚫 Banlı' : '✅ Aktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => openEcon(u)} className="px-2 py-1 text-xs bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/30 transition-colors">
                        💰 Bakiye
                      </button>
                      <button onClick={() => toggleRole(u)} className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors">
                        {u.role === 'Admin' ? '⬇️ Kullanıcı Yap' : '⬆️ Admin Yap'}
                      </button>
                      <button onClick={() => toggleBan(u)} className={`px-2 py-1 text-xs rounded-lg transition-colors ${u.isBanned ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}>
                        {u.isBanned ? '✅ Ban Kaldır' : '🚫 Banla'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${p === page ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Economy Modal */}
      {econModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[var(--color-text)] text-lg">💰 {econModal.username} — Bakiye</h3>
              <button onClick={() => setEconModal(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">✕</button>
            </div>
            <div className="text-sm text-[var(--color-text-muted)]">
              Mevcut: <span className="text-[var(--color-text)] font-semibold">{econModal.xp} XP</span> · <span className="text-[var(--color-text)] font-semibold">{econModal.coinBalance} Coin</span> · Seviye {econModal.level}
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">XP Ekle / Çıkar (örn: +100 veya -50)</span>
                <input type="number" value={deltaXP} onChange={e => setDeltaXP(e.target.value)} className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)]" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">Coin Ekle / Çıkar</span>
                <input type="number" value={deltaCoin} onChange={e => setDeltaCoin(e.target.value)} className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)]" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">Seviye Ayarla (boş bırakılırsa değişmez)</span>
                <input type="number" value={setLvl} onChange={e => setSetLvl(e.target.value)} placeholder="örn: 5" className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)]" />
              </label>
            </div>
            {msg && <div className="text-sm text-center text-[var(--color-text-muted)]">{msg}</div>}
            <div className="flex gap-3">
              <button onClick={() => setEconModal(null)} className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm hover:bg-[var(--color-surface-secondary)] transition-colors">İptal</button>
              <button onClick={saveEcon} disabled={saving} className="flex-1 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Questions Tab ───────────────────────────────────────────────────────────
function QuestionsTab() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [exams, setExams] = useState<AdminExamRef[]>([]);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<AdminQuestion | null>(null);
  const [form, setForm] = useState({
    examId: '', branch: '', questionText: '', correctAnswer: 'A', poolType: 'Solo',
    solutionText: '', imageUrl: '',
    choiceA: '', choiceB: '', choiceC: '', choiceD: '', choiceE: ''
  });
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  const branches = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe', 'Geometri', 'Edebiyat'];

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAdminQuestions({ search, branch: branch || undefined, page, pageSize: 12 });
      setQuestions(data.questions);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, branch, page]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);
  useEffect(() => { getAdminExams().then(r => setExams(r.data)); }, []);

  const openCreate = () => {
    setForm({ examId: exams[0]?.id || '', branch: '', questionText: '', correctAnswer: 'A', poolType: 'Solo', solutionText: '', imageUrl: '', choiceA: '', choiceB: '', choiceC: '', choiceD: '', choiceE: '' });
    setEditTarget(null);
    setFormMsg('');
    setModal('create');
  };

  const openEdit = (q: AdminQuestion) => {
    setForm({
      examId: q.examId,
      branch: q.branch,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      poolType: q.poolType,
      solutionText: q.solutionText || '',
      imageUrl: q.imageUrl || '',
      choiceA: q.choices['A'] || '',
      choiceB: q.choices['B'] || '',
      choiceC: q.choices['C'] || '',
      choiceD: q.choices['D'] || '',
      choiceE: q.choices['E'] || ''
    });
    setEditTarget(q);
    setFormMsg('');
    setModal('edit');
  };

  const saveForm = async () => {
    setSaving(true);
    setFormMsg('');
    try {
      const choices: Record<string, string> = {};
      if (form.choiceA) choices['A'] = form.choiceA;
      if (form.choiceB) choices['B'] = form.choiceB;
      if (form.choiceC) choices['C'] = form.choiceC;
      if (form.choiceD) choices['D'] = form.choiceD;
      if (form.choiceE) choices['E'] = form.choiceE;

      if (modal === 'create') {
        await createAdminQuestion({
          examId: form.examId,
          branch: form.branch,
          questionText: form.questionText,
          choices,
          correctAnswer: form.correctAnswer,
          solutionText: form.solutionText || undefined,
          imageUrl: form.imageUrl || undefined,
          poolType: form.poolType
        });
        setFormMsg('✅ Soru eklendi!');
      } else if (editTarget) {
        await updateAdminQuestion(editTarget.id, {
          branch: form.branch,
          questionText: form.questionText,
          choices,
          correctAnswer: form.correctAnswer,
          solutionText: form.solutionText || undefined,
          imageUrl: form.imageUrl || undefined,
          poolType: form.poolType
        });
        setFormMsg('✅ Güncellendi!');
      }
      fetchQuestions();
    } catch {
      setFormMsg('❌ Hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return;
    await deleteAdminQuestion(id);
    fetchQuestions();
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Soru ara..."
          className="flex-1 min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2 text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
        />
        <select
          value={branch}
          onChange={e => { setBranch(e.target.value); setPage(1); }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">Tüm Branşlar</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <button onClick={openCreate} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
          ➕ Yeni Soru
        </button>
      </div>

      {/* Question Grid */}
      {loading ? (
        <div className="text-center py-10 text-[var(--color-text-muted)]">Yükleniyor...</div>
      ) : (
        <div className="grid gap-3">
          {questions.map(q => (
            <div key={q.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex gap-4 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]">{q.branch}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">{q.poolType}</span>
                  <span className="text-xs text-[var(--color-text-muted)] truncate">{q.examTitle}</span>
                </div>
                <p className="text-sm text-[var(--color-text)] line-clamp-2">{q.questionText}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(q.choices).map(([k, v]) => (
                    <span key={k} className={`text-xs px-2 py-0.5 rounded-full ${k === q.correctAnswer ? 'bg-green-500/20 text-green-400' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]'}`}>
                      {k}: {v.substring(0, 30)}{v.length > 30 ? '...' : ''}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => openEdit(q)} className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors">✏️ Düzenle</button>
                <button onClick={() => handleDelete(q.id)} className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">🗑️ Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${p === page ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[var(--color-text)] text-lg">{modal === 'create' ? '➕ Yeni Soru' : '✏️ Soruyu Düzenle'}</h3>
              <button onClick={() => setModal(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-xs text-[var(--color-text-muted)]">Sınav</span>
                <select value={form.examId} onChange={e => setForm(f => ({ ...f, examId: e.target.value }))} className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none">
                  {exams.map(e => <option key={e.id} value={e.id}>{e.title} ({e.questionCount} soru)</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">Branş</span>
                <select value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none">
                  <option value="">Seçin</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">Havuz</span>
                <select value={form.poolType} onChange={e => setForm(f => ({ ...f, poolType: e.target.value }))} className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none">
                  <option value="Solo">Solo</option>
                  <option value="Battleground">Battleground</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-text-muted)]">Soru Metni</span>
              <textarea value={form.questionText} onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))} rows={3} className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none resize-none" />
            </label>

            {['A', 'B', 'C', 'D', 'E'].map(key => (
              <label key={key} className="flex items-center gap-2">
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${form.correctAnswer === key ? 'bg-green-500 text-white' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]'}`}>{key}</span>
                <input
                  value={(form as Record<string, string>)[`choice${key}`]}
                  onChange={e => setForm(f => ({ ...f, [`choice${key}`]: e.target.value }))}
                  placeholder={`${key} şıkkı`}
                  className="flex-1 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none"
                />
                <button onClick={() => setForm(f => ({ ...f, correctAnswer: key }))} className={`px-2 py-1 text-xs rounded-lg transition-colors ${form.correctAnswer === key ? 'bg-green-500/20 text-green-400' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-green-500/10 hover:text-green-400'}`}>
                  {form.correctAnswer === key ? '✓ Doğru' : 'Doğru?'}
                </button>
              </label>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">Görsel URL (opsiyonel)</span>
                <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">Çözüm (opsiyonel)</span>
                <input value={form.solutionText} onChange={e => setForm(f => ({ ...f, solutionText: e.target.value }))} className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none" />
              </label>
            </div>

            {formMsg && <div className="text-sm text-center text-[var(--color-text-muted)]">{formMsg}</div>}
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm hover:bg-[var(--color-surface-secondary)] transition-colors">İptal</button>
              <button onClick={saveForm} disabled={saving} className="flex-1 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : modal === 'create' ? 'Soruyu Ekle' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rooms Tab ───────────────────────────────────────────────────────────────
function RoomsTab() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data } = await getAdminRooms();
      setRooms(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleTerminate = async (code: string) => {
    if (!confirm(`"${code}" odasını zorla kapatmak istiyor musunuz?`)) return;
    await terminateRoom(code);
    fetchRooms();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-[var(--color-text-muted)]">{rooms.length} aktif oda</span>
        <button onClick={fetchRooms} className="px-3 py-1.5 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">🔄 Yenile</button>
      </div>
      {loading ? (
        <div className="text-center py-10 text-[var(--color-text-muted)]">Yükleniyor...</div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-10 text-[var(--color-text-muted)]">Şu anda aktif oda yok.</div>
      ) : (
        <div className="grid gap-3">
          {rooms.map(r => (
            <div key={r.code} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[var(--color-text)] font-mono">{r.code}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">{r.status}</span>
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">{r.examTitle} · {r.playerCount} oyuncu</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">{r.players.join(', ')}</div>
              </div>
              <button onClick={() => handleTerminate(r.code)} className="px-3 py-2 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-semibold shrink-0">
                🔴 Kapat
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main AdminPage ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'Admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">Erişim Yetkiniz Yok</div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Genel Bakış', icon: '📊' },
    { id: 'questions', label: 'Soru Yönetimi', icon: '📝' },
    { id: 'users', label: 'Kullanıcılar', icon: '👥' },
    { id: 'rooms', label: 'Canlı Odalar', icon: '⚔️' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors text-sm">← Geri</button>
          <div className="w-px h-5 bg-[var(--color-border)]" />
          <h1 className="font-bold text-[var(--color-text)] text-xl">👑 Admin Paneli</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">Kurucu</span>
        </div>
        <div className="text-sm text-[var(--color-text-muted)]">@{user.username}</div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${tab === t.id ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'questions' && <QuestionsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'rooms' && <RoomsTab />}
      </div>
    </div>
  );
}
