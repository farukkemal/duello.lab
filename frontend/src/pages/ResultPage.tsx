import { useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { type ExamResult } from '../api/exams';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const result = location.state as ExamResult | undefined;

  // Refresh user data to update XP/Level in context
  useEffect(() => {
    refreshUser();
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

  const scoreColor = result.netScore >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="bg-[var(--color-surface)] rounded-2xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-center mb-2">Sınav Sonucu</h1>
          <p className="text-center text-[var(--color-text-muted)] mb-8">{result.examTitle}</p>

          {/* Score Circle */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center" style={{ borderColor: scoreColor }}>
              <span className="text-3xl font-bold" style={{ color: scoreColor }}>
                {result.netScore.toFixed(1)}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">Net Puan</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--color-surface-light)] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-success)]">{result.correctCount}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Doğru</div>
            </div>
            <div className="bg-[var(--color-surface-light)] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-danger)]">{result.wrongCount}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Yanlış</div>
            </div>
            <div className="bg-[var(--color-surface-light)] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-text-muted)]">{result.blankCount}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Boş</div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 mb-8">
            <div className="flex justify-between py-2 border-b border-[var(--color-surface-light)]">
              <span className="text-[var(--color-text-muted)]">Toplam Soru</span>
              <span className="font-semibold">{result.totalQuestions}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--color-surface-light)]">
              <span className="text-[var(--color-text-muted)]">Süre</span>
              <span className="font-semibold">{formatDuration(result.durationMs)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--color-surface-light)]">
              <span className="text-[var(--color-text-muted)]">Süre (ms)</span>
              <span className="font-mono text-sm">{result.durationMs.toLocaleString()} ms</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--color-surface-light)]">
              <span className="text-[var(--color-text-muted)]">Kazanılan XP</span>
              <span className="font-semibold text-[var(--color-accent)]">+{result.xpGained} XP</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[var(--color-text-muted)]">Yeni Seviye</span>
              <span className="font-semibold text-[var(--color-primary)]">Seviye {result.newLevel}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold py-3 rounded-lg transition"
          >
            Dashboard'a Dön
          </button>
        </div>
      </div>
    </div>
  );
}
