import { useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { type ExamResult } from '../api/exams';
import { triggerLevelUpConfetti } from '../utils/confetti';
import MobileTopHUD from '../components/MobileTopHUD';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const result = location.state as ExamResult | undefined;

  useEffect(() => {
    refreshUser();
    if (result && result.netScore > 0) {
      triggerLevelUpConfetti();
    }
  }, []);

  if (!result) {
    return <Navigate to="/dashboard" replace />;
  }

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min} dk ${sec} sn`;
  };

  const isPositive = result.netScore >= 0;

  return (
    <div className="min-h-screen bg-[#060710] flex justify-center">
      <div className="w-full max-w-md mobile-app-shell flex flex-col justify-between relative overflow-hidden">
        
        {/* Mobile Top HUD */}
        <MobileTopHUD />

        {/* Content */}
        <main className="flex-1 p-4 flex flex-col justify-between space-y-4 overflow-y-auto no-scrollbar animate-fadeIn">
          
          <div className="game-card-3d p-6 text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[10px] font-black uppercase tracking-wider">
              📊 SOLO PRATİK SONUCU
            </div>

            <h2 className="text-xl font-black text-white">{result.examTitle}</h2>

            {/* Score Dial */}
            <div className="flex justify-center py-2">
              <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center shadow-2xl relative ${
                isPositive ? 'border-emerald-500 bg-emerald-500/10 shadow-emerald-500/30' : 'border-rose-500 bg-rose-500/10 shadow-rose-500/30'
              }`}>
                <span className={`text-3xl font-black font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.netScore.toFixed(1)}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Net Skor</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-2.5 text-center">
                <div className="text-lg font-black text-emerald-400 font-mono">{result.correctCount}</div>
                <div className="text-[10px] font-bold text-slate-300">Doğru</div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-2.5 text-center">
                <div className="text-lg font-black text-rose-400 font-mono">{result.wrongCount}</div>
                <div className="text-[10px] font-bold text-slate-300">Yanlış</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
                <div className="text-lg font-black text-slate-400 font-mono">{result.blankCount}</div>
                <div className="text-[10px] font-bold text-slate-300">Boş</div>
              </div>
            </div>

            {/* Details Card */}
            <div className="bg-black/30 rounded-2xl p-3.5 border border-white/5 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Çözüm Süresi:</span>
                <span className="font-bold text-white font-mono">{formatDuration(result.durationMs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Milisaniye (Tie-Breaker):</span>
                <span className="font-bold text-cyan-400 font-mono">{result.durationMs.toLocaleString()} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kazanılan Tecrübe:</span>
                <span className="font-black text-amber-300 font-mono">+{result.xpGained} XP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Yeni Seviye:</span>
                <span className="font-black text-violet-300">Seviye {result.newLevel}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 rounded-2xl btn-game-primary text-white font-black text-sm uppercase cursor-pointer"
          >
            Ana Menüye Dön 🏠
          </button>

        </main>
      </div>
    </div>
  );
}
