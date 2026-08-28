import { useState, useEffect } from 'react';
import { getExamReview, getExamReviewWithAnswers, type ExamReview } from '../api/analytics';
import { getRoomReview } from '../api/rooms';

interface QuestionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
  examId?: string;
  answers?: Record<string, string | null>;
  fallbackQuestions?: Array<{
    id: string;
    branch: string;
    questionText: string;
    choices: Record<string, string>;
    correctAnswer?: string;
    solutionText?: string;
    imageUrl?: string;
  }>;
}

export default function QuestionReviewModal({
  isOpen,
  onClose,
  roomCode,
  examId,
  answers,
  fallbackQuestions
}: QuestionReviewModalProps) {
  const [review, setReview] = useState<ExamReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'wrong'>('wrong');

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

    if (roomCode) {
      getRoomReview(roomCode)
        .then(({ data }) => {
          if (data && Array.isArray(data.questions) && data.questions.length > 0) {
            setReview(data);
          } else {
            constructFallback();
          }
        })
        .catch(() => {
          constructFallback();
        })
        .finally(() => setLoading(false));
    } else if (examId) {
      const fetcher = answers
        ? getExamReviewWithAnswers(examId, answers)
        : getExamReview(examId);

      fetcher
        .then(({ data }) => setReview(data))
        .catch(() => {
          constructFallback();
        })
        .finally(() => setLoading(false));
    } else {
      constructFallback();
      setLoading(false);
    }
  }, [isOpen, roomCode, examId, answers]);

  const constructFallback = () => {
    if (!fallbackQuestions || fallbackQuestions.length === 0) {
      setReview(null);
      return;
    }

    const reviewList = fallbackQuestions.map((q) => {
      const qIdStr = String(q.id);
      const selected = answers ? (answers[qIdStr] || answers[q.id] || null) : null;
      const correctTarget = ((q as any).correctAnswer || (q as any).CorrectAnswer || 'A').trim().toUpperCase();

      let isCorrect = false;
      if (selected) {
        if (selected.includes(',')) {
          isCorrect = selected.split(',').some((s: string) => s.trim().toUpperCase() === correctTarget);
        } else {
          isCorrect = selected.trim().toUpperCase() === correctTarget;
        }
      }

      return {
        questionId: q.id,
        branch: q.branch || 'Genel',
        questionText: q.questionText || '',
        choices: q.choices || {},
        correctAnswer: correctTarget,
        selectedAnswer: selected,
        isCorrect: isCorrect,
        solutionText: (q as any).solutionText || (q as any).SolutionText || `Doğru cevap ${correctTarget} şıkkıdır. Konu kazanımındaki temel kurallar uygulandığında çözüme ulaşılmaktadır.`,
        imageUrl: q.imageUrl || null,
        aiExplanationTip: isCorrect
          ? '🎯 Tebrikler! Doğru yaklaşım sergiledin.'
          : `⚠️ Bu soruda doğru şık (${correctTarget}). Çözüm basamaklarındaki mantık kurgusuna dikkat et.`
      };
    });

    setReview({
      examId: examId || roomCode || 'match-review',
      examTitle: 'Sınav Analizi & Çözümleri',
      category: 'TYT',
      correctCount: reviewList.filter(q => q.isCorrect).length,
      wrongCount: reviewList.filter(q => !q.isCorrect && q.selectedAnswer).length,
      blankCount: reviewList.filter(q => !q.selectedAnswer).length,
      netScore: reviewList.filter(q => q.isCorrect).length - (reviewList.filter(q => !q.isCorrect && q.selectedAnswer).length / 2.0),
      questions: reviewList
    });
  };

  if (!isOpen) return null;

  const filteredQuestions = (Array.isArray(review?.questions) ? review.questions : []).filter((q) => {
    if (activeTab === 'wrong') return !q.isCorrect;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#131631] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[88vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <div>
              <h3 className="text-lg font-black text-white">Soru Çözüm Analizi</h3>
              <p className="text-[10px] text-slate-400">Doğru şıklar ve detaylı açıklamalar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Filter */}
        <div className="flex gap-1 bg-[#1b2046] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('wrong')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'wrong' ? 'bg-rose-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            ❌ Yalnızca Yanlışlar ({review?.questions.filter(q => !q.isCorrect).length || 0})
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'all' ? 'bg-violet-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            Tüm Sorular ({review?.questions.length || 0})
          </button>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Çözümler Hazırlanıyor...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="py-8 text-center text-emerald-400 text-xs font-bold">
                🎉 Harika! Bu kategoride incelenecek yanlış soru bulunamadı.
              </div>
            ) : (
              filteredQuestions.map((q, idx) => (
                <div
                  key={q.questionId}
                  className={`bg-[#171b38] border-2 rounded-2xl p-4 space-y-3 ${
                    q.isCorrect ? 'border-emerald-500/40' : 'border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                      Soru #{idx + 1} • {q.branch}
                    </span>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg font-mono ${
                      q.isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {q.isCorrect ? '✓ Doğru' : '✕ Yanlış'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-white leading-relaxed whitespace-pre-wrap">
                    {q.questionText}
                  </p>

                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="Soru görseli" className="max-w-full rounded-xl border border-white/10" />
                  )}

                  {/* Choices list */}
                  <div className="space-y-1.5 pt-1">
                    {Object.entries(q.choices).map(([key, text]) => {
                      const isSelected = q.selectedAnswer?.toUpperCase() === key.toUpperCase();
                      const isCorrectChoice = q.correctAnswer.toUpperCase() === key.toUpperCase();

                      return (
                        <div
                          key={key}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                            isCorrectChoice
                              ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                              : isSelected
                                ? 'bg-rose-950/50 border-rose-500 text-rose-200'
                                : 'bg-black/20 border-white/5 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-black ${
                              isCorrectChoice
                                ? 'bg-emerald-500 text-slate-950'
                                : isSelected
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-white/10 text-slate-400'
                            }`}>
                              {key}
                            </span>
                            <span>{text}</span>
                          </div>

                          {isCorrectChoice && (
                            <span className="text-[10px] text-emerald-400 font-bold">Doğru Cevap ✓</span>
                          )}
                          {isSelected && !isCorrectChoice && (
                            <span className="text-[10px] text-rose-400 font-bold">Senin Seçimin ✕</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Solution Box */}
                  <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-1.5">
                    <div className="text-[10px] font-black text-amber-300 uppercase flex items-center gap-1">
                      <span>💡 Detaylı Çözüm Açıklaması</span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      {q.solutionText}
                    </p>
                    <div className="text-[10px] text-violet-300 font-semibold pt-1 border-t border-white/5">
                      {q.aiExplanationTip}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer"
        >
          Kapat
        </button>

      </div>
    </div>
  );
}
