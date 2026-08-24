import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBotRoom } from '../api/rooms';

// ──────────────────────────────────────────────────────────────────────────────
// Bot tanımları — isim, YKS sıralaması, zorluk bilgisi, görsel meta
// ──────────────────────────────────────────────────────────────────────────────
const BOT_PROFILES = [
  {
    key: 'berkay',
    emoji: '🐢',
    name: 'Berkay',
    rank: 'YKS 1.000.000\'uncu',
    description: 'Temel konuları çalışıyor, ama hâlâ çok boş bırakıyor.',
    correct: '%40 Doğru',
    speed: 'Yavaş',
    color: 'from-slate-600 to-slate-500',
    border: 'border-slate-500/40',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  },
  {
    key: 'selin',
    emoji: '🌱',
    name: 'Selin',
    rank: 'YKS 500.000\'incisi',
    description: 'Düzenli çalışıyor; orta zorluk sorularda takılıyor.',
    correct: '%55 Doğru',
    speed: 'Orta-Yavaş',
    color: 'from-emerald-700 to-teal-600',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    key: 'emre',
    emoji: '⚡',
    name: 'Emre',
    rank: 'YKS 100.000\'incisi',
    description: 'Güçlü bir rakip — hızlı ve isabetli.',
    correct: '%70 Doğru',
    speed: 'Orta',
    color: 'from-cyan-700 to-blue-600',
    border: 'border-cyan-500/40',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  {
    key: 'nur',
    emoji: '🔥',
    name: 'Nur',
    rank: 'YKS 50.000\'incisi',
    description: 'Çok az boş bırakır, hatalarda cimri.',
    correct: '%82 Doğru',
    speed: 'Hızlı',
    color: 'from-orange-700 to-rose-600',
    border: 'border-orange-500/40',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  {
    key: 'esma',
    emoji: '💎',
    name: 'Esma',
    rank: 'YKS 100\'üncüsü',
    description: 'Neredeyse hatasız. Seni geçmek için mükemmel olmak zorundasın!',
    correct: '%94 Doğru',
    speed: 'Çok Hızlı',
    color: 'from-violet-700 to-purple-600',
    border: 'border-violet-500/40',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  },
] as const;

type BotKey = typeof BOT_PROFILES[number]['key'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function BotMatchModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();

  const [category, setCategory] = useState<'TYT' | 'AYT'>('TYT');
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedBots, setSelectedBots] = useState<BotKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleBot = (key: BotKey) => {
    setSelectedBots(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, key];
    });
  };

  const handleStart = async () => {
    if (selectedBots.length === 0) {
      setError('En az 1 bot seçmelisin!');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data } = await createBotRoom({
        category,
        questionCount,
        botDifficulties: selectedBots,
      });
      onClose();
      navigate(`/lobby/${data.roomCode}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Antrenman başlatılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#131631] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="text-base font-black text-white leading-tight">Botlarla Kendini Geliştir</h3>
              <p className="text-[10px] text-slate-400">Rakip seç, ödül yok — sadece gelişim!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-5 space-y-5">

          {error && (
            <div className="bg-rose-500/20 border border-rose-500 text-rose-300 text-xs rounded-xl p-2.5 font-bold">
              {error}
            </div>
          )}

          {/* Kategori */}
          <div className="space-y-2">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kategori</div>
            <div className="flex gap-2">
              {(['TYT', 'AYT'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black uppercase cursor-pointer transition-all ${
                    category === cat
                      ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg'
                      : 'bg-[#1b2046] text-slate-400 border border-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Soru Sayısı */}
          <div className="space-y-2">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Soru Sayısı</div>
            <div className="flex gap-2">
              {[3, 5, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    questionCount === n
                      ? 'bg-violet-600 text-white shadow'
                      : 'bg-[#1b2046] text-slate-400 border border-white/10'
                  }`}
                >
                  {n} Soru
                </button>
              ))}
            </div>
          </div>

          {/* Bot Seçimi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Rakip Botlar
              </div>
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                selectedBots.length === 4
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}>
                {selectedBots.length}/4 seçildi
              </div>
            </div>

            <div className="space-y-2">
              {BOT_PROFILES.map(bot => {
                const isSelected = selectedBots.includes(bot.key);
                const isDisabled = !isSelected && selectedBots.length >= 4;

                return (
                  <button
                    key={bot.key}
                    onClick={() => toggleBot(bot.key)}
                    disabled={isDisabled}
                    className={`w-full text-left p-3 rounded-2xl border-2 transition-all cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? `bg-gradient-to-r ${bot.color} border-transparent shadow-lg`
                        : `bg-[#171b38] ${bot.border} hover:bg-[#1d2248]`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${bot.color} flex items-center justify-center text-xl shrink-0 shadow-lg`}>
                        {bot.emoji}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-white">{bot.name}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${bot.badge}`}>
                            {bot.rank}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">{bot.description}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[9px] text-emerald-400 font-bold">{bot.correct}</span>
                          <span className="text-[9px] text-slate-500">•</span>
                          <span className="text-[9px] text-cyan-400 font-bold">⚡ {bot.speed}</span>
                        </div>
                      </div>

                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white border-white' : 'border-white/30'
                      }`}>
                        {isSelected && <span className="text-violet-900 text-xs font-black">✓</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bilgi notu */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
            <span className="text-amber-400 shrink-0">ℹ️</span>
            <p className="text-[10px] text-amber-200 leading-relaxed">
              Bot maçları <span className="font-black">ücretsizdir</span> ve <span className="font-black">ödül kazandırmaz</span>.
              Seçilen her bot farklı bir zorluk seviyesindedir. 4 bota kadar ekleyebilirsin.
            </p>
          </div>

        </div>

        {/* Footer CTA */}
        <div className="px-5 pb-5 pt-2 shrink-0 space-y-2 border-t border-white/5">
          <button
            onClick={handleStart}
            disabled={loading || selectedBots.length === 0}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 font-black text-sm uppercase text-white shadow-xl cursor-pointer active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Hazırlanıyor...
              </>
            ) : (
              <>🤖 Antrenmanı Başlat ({selectedBots.length} Bot)</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
