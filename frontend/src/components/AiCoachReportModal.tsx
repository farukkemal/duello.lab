import { useState, useEffect } from 'react';
import { getWeaknessReport, type AiCoachReport } from '../api/analytics';

interface AiCoachReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiCoachReportModal({ isOpen, onClose }: AiCoachReportModalProps) {
  const [report, setReport] = useState<AiCoachReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getWeaknessReport()
        .then(({ data }) => setReport(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#131631] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <div>
              <h3 className="text-lg font-black text-white">AI Sınav Koçu & Isı Haritası</h3>
              <p className="text-[10px] text-slate-400">Yapay zeka destekli zayıf nokta analizi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            AI Performans Verilerini İnceliyor...
          </div>
        ) : report ? (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
            
            {/* Top Stat Highlights */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#1b2046] border border-white/10 rounded-2xl p-2.5 text-center">
                <div className="text-[9px] text-slate-400 font-bold">Toplam Soru</div>
                <div className="text-sm font-mono font-black text-white">{report.totalQuestionsSolved}</div>
              </div>
              <div className="bg-[#1b2046] border border-white/10 rounded-2xl p-2.5 text-center">
                <div className="text-[9px] text-slate-400 font-bold">Genel Başarı</div>
                <div className="text-sm font-mono font-black text-emerald-400">%{report.overallAccuracyRate}</div>
              </div>
              <div className="bg-[#1b2046] border border-white/10 rounded-2xl p-2.5 text-center">
                <div className="text-[9px] text-slate-400 font-bold">Ortalama Net</div>
                <div className="text-sm font-mono font-black text-amber-300">{report.averageNetScore}</div>
              </div>
            </div>

            {/* AI Advice Callout Box */}
            <div className="bg-gradient-to-r from-violet-950/60 to-purple-950/60 border border-violet-500/40 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-violet-300 uppercase">
                <span>🤖 AI Koç Özel Tavsiyeleri</span>
              </div>

              <div className="space-y-1.5">
                {report.aiAdviceList.map((adv, idx) => (
                  <div key={idx} className="text-[11px] text-slate-200 font-semibold leading-relaxed">
                    {adv}
                  </div>
                ))}
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px] bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/5">
                <span className="text-slate-400 font-bold">🎯 Önerilen Günlük Mod:</span>
                <span className="font-black text-amber-300 font-mono">{report.dailyRecommendedMode}</span>
              </div>
            </div>

            {/* Branch Weakness Heatmap */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black px-1">
                <span className="text-white">Ders & Branş Isı Haritası</span>
                <span className="text-[9px] text-slate-400">Başarı Yüzdesi</span>
              </div>

              {report.branchHeatmap.map((b) => (
                <div
                  key={b.branch}
                  className="bg-[#1b2046] border border-white/10 rounded-2xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        b.statusColor === 'emerald' ? 'bg-emerald-400' : b.statusColor === 'amber' ? 'bg-amber-400' : 'bg-rose-500'
                      }`} />
                      <span>{b.branch}</span>
                    </span>

                    <span className={`font-mono font-black ${
                      b.statusColor === 'emerald' ? 'text-emerald-400' : b.statusColor === 'amber' ? 'text-amber-300' : 'text-rose-400'
                    }`}>
                      %{b.accuracyRate}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        b.statusColor === 'emerald' ? 'bg-emerald-400' : b.statusColor === 'amber' ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(5, b.accuracyRate)}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-300 leading-tight">
                    {b.recommendation}
                  </p>
                </div>
              ))}
            </div>

          </div>
        ) : null}

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer"
        >
          Anladım, Çalışmaya Başla 🚀
        </button>

      </div>
    </div>
  );
}
