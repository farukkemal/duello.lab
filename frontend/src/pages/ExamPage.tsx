import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSoloExam, submitExam, type SoloExam, type SoloQuestion } from '../api/exams';
import { useAuth } from '../contexts/AuthContext';
import { useJoker } from '../api/store';
import { triggerPodiumConfetti } from '../utils/confetti';
import MobileTopHUD from '../components/MobileTopHUD';

export default function ExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [exam, setExam] = useState<SoloExam | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Joker states
  const [eliminatedChoicesMap, setEliminatedChoicesMap] = useState<Record<string, string[]>>({});
  const [doubleChanceActiveMap, setDoubleChanceActiveMap] = useState<Record<string, boolean>>({});
  const [selectedDoubleChoicesMap, setSelectedDoubleChoicesMap] = useState<Record<string, string[]>>({});
  const [jokerLoading, setJokerLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!examId) return;
    getSoloExam(examId)
      .then(({ data }) => {
        setExam(data);
        const initial: Record<string, string | null> = {};
        data.questions.forEach(q => { initial[q.id] = null; });
        setAnswers(initial);
        setLoading(false);
        timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
      })
      .catch(() => navigate('/dashboard'));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examId, navigate]);

  useEffect(() => {
    if (!exam || !exam.questions[currentIndex]) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const currentQ = exam.questions[currentIndex];
      if (!currentQ) return;

      const choiceKeys = Object.keys(currentQ.choices);
      let selectedKey: string | null = null;

      if (choiceKeys.includes(key)) {
        selectedKey = key;
      } else if (['1', '2', '3', '4', '5'].includes(key)) {
        const num = parseInt(key, 10) - 1;
        if (num < choiceKeys.length) selectedKey = choiceKeys[num];
      }

      if (selectedKey) {
        handleAnswer(currentQ.id, selectedKey);
      } else if (e.key === 'ArrowRight' && currentIndex < exam.questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exam, currentIndex, answers, doubleChanceActiveMap, selectedDoubleChoicesMap, eliminatedChoicesMap]);

  const handleUseEliminateThree = async () => {
    const currentQ = exam?.questions[currentIndex];
    if (!user || (user.jokerEliminateThree ?? 0) <= 0 || !currentQ) return;
    if (eliminatedChoicesMap[currentQ.id]?.length > 0) {
      showToast('⚠️ Bu soruda zaten 3 şık eleme jokeri kullanıldı.');
      return;
    }

    setJokerLoading(true);
    try {
      const { data } = await useJoker('eliminate_three', currentQ.id);
      await refreshUser();

      const toEliminate = data.eliminatedChoices || [];

      setEliminatedChoicesMap(prev => ({
        ...prev,
        [currentQ.id]: toEliminate
      }));

      // If current answer was eliminated, clear it
      if (toEliminate.includes(answers[currentQ.id] || '')) {
        setAnswers(prev => ({ ...prev, [currentQ.id]: null }));
      }
      if (selectedDoubleChoicesMap[currentQ.id]) {
        setSelectedDoubleChoicesMap(prev => ({
          ...prev,
          [currentQ.id]: (prev[currentQ.id] || []).filter(c => !toEliminate.includes(c))
        }));
      }

      showToast('🎯 3 Yanlış Şık Elendi! 2 şık kaldı.');
      triggerPodiumConfetti();
    } catch (e: any) {
      showToast(e.response?.data?.message || e.response?.data || 'Joker kullanılamadı.');
    } finally {
      setJokerLoading(false);
    }
  };

  const handleUseDoubleChance = async () => {
    const currentQ = exam?.questions[currentIndex];
    if (!user || (user.jokerDoubleChance ?? 0) <= 0 || !currentQ) return;
    if (doubleChanceActiveMap[currentQ.id]) {
      showToast('⚠️ Bu soruda zaten çift cevap jokeri aktif.');
      return;
    }

    setJokerLoading(true);
    try {
      await useJoker('double_chance');
      await refreshUser();

      setDoubleChanceActiveMap(prev => ({
        ...prev,
        [currentQ.id]: true
      }));

      const curr = answers[currentQ.id];
      if (curr) {
        setSelectedDoubleChoicesMap(prev => ({
          ...prev,
          [currentQ.id]: [curr]
        }));
      }

      showToast('✌️ Çift Cevap Jokeri Aktif! Şimdi 2 şık seçebilirsin.');
      triggerPodiumConfetti();
    } catch (e: any) {
      showToast(e.response?.data?.message || e.response?.data || 'Joker kullanılamadı.');
    } finally {
      setJokerLoading(false);
    }
  };

  const handleUseExtraTime = async () => {
    if (!user || (user.jokerExtraTime ?? 0) <= 0) return;

    setJokerLoading(true);
    try {
      await useJoker('extra_time');
      await refreshUser();

      setElapsed(prev => Math.max(0, prev - 15)); // Süreyi 15 saniye geriye sararak avantaj sağlar
      showToast('⏳ Sürene +15 Saniye Avantaj Eklendi!');
      triggerPodiumConfetti();
    } catch (e: any) {
      showToast(e.response?.data?.message || e.response?.data || 'Joker kullanılamadı.');
    } finally {
      setJokerLoading(false);
    }
  };

  const handleAnswer = (questionId: string, choice: string) => {
    // Block if choice was eliminated
    if (eliminatedChoicesMap[questionId]?.includes(choice)) {
      showToast('🚫 Bu şık elenmiştir, seçilemez.');
      return;
    }

    const isDoubleChance = doubleChanceActiveMap[questionId];

    if (isDoubleChance) {
      const currentSelected = selectedDoubleChoicesMap[questionId] || [];
      let newSelected: string[];

      if (currentSelected.includes(choice)) {
        newSelected = currentSelected.filter(k => k !== choice);
      } else if (currentSelected.length < 2) {
        newSelected = [...currentSelected, choice];
      } else {
        newSelected = [currentSelected[1], choice];
      }

      setSelectedDoubleChoicesMap(prev => ({
        ...prev,
        [questionId]: newSelected
      }));

      const answerValue = newSelected.length > 0 ? newSelected.join(',') : null;
      setAnswers(prev => ({
        ...prev,
        [questionId]: answerValue
      }));
      return;
    }

    setAnswers(prev => ({
      ...prev,
      [questionId]: prev[questionId] === choice ? null : choice
    }));
  };

  const handleSubmit = async () => {
    if (!exam) return;
    if (!confirm('Sınavı bitirmek istediğinize emin misiniz?')) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const payload = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
        questionId,
        selectedAnswer,
      }));
      const { data } = await submitExam(exam.examId, exam.startToken, payload);
      navigate(`/results/${data.resultId}`, { state: data });
    } catch (err) {
      alert('Sınav gönderilemedi. Lütfen tekrar deneyin.');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !exam) {
    return (
      <div className="min-h-screen bg-[#060710] flex justify-center items-center">
        <div className="w-full max-w-md mobile-app-shell flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-white font-black text-sm">Sınav Yükleniyor...</div>
        </div>
      </div>
    );
  }

  const question: SoloQuestion = exam.questions[currentIndex];
  const totalQuestions = exam.questions.length;
  const answeredCount = Object.values(answers).filter(a => a !== null).length;

  return (
    <div className="min-h-screen bg-[#060710] flex justify-center">
      <div className="w-full max-w-md mobile-app-shell flex flex-col justify-between relative overflow-hidden">
        
        {/* Mobile Top HUD */}
        <MobileTopHUD />

        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-violet-600 to-purple-600 border border-white/20 text-white px-4 py-2 rounded-2xl shadow-2xl text-xs font-black animate-bounce whitespace-nowrap">
            {toastMessage}
          </div>
        )}

        {/* Exam HUD */}
        <div className="bg-[#10132b] px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-white truncate max-w-[170px]">{exam.title}</div>
            <div className="text-[10px] text-slate-400 font-mono">Soru {currentIndex + 1}/{totalQuestions}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-black/30 px-2.5 py-1 rounded-xl text-center border border-white/5">
              <span className="font-mono font-black text-cyan-400 text-xs">⏱️ {formatTime(elapsed)}</span>
            </div>
            <div className="text-[10px] font-bold text-slate-300 font-mono">
              {answeredCount}/{totalQuestions} Çözüldü
            </div>
          </div>
        </div>

        {/* Question Container */}
        <main className="flex-1 p-3.5 flex flex-col justify-between overflow-y-auto no-scrollbar space-y-3">
          
          {/* IN-GAME JOKER TOOLBAR */}
          <div className="bg-[#121533] border border-amber-400/30 rounded-2xl p-2 flex items-center justify-between gap-1.5 shadow-lg">
            <div className="text-[10px] font-black text-amber-300 uppercase flex items-center gap-1 pl-1 shrink-0">
              <span>🃏</span> <span>Jokerler</span>
            </div>

            <div className="flex items-center gap-1.5 flex-1 justify-end">
              {/* Joker 1: 3 Şık Eleme */}
              <button
                onClick={handleUseEliminateThree}
                disabled={jokerLoading || (user?.jokerEliminateThree ?? 0) <= 0 || (question && (eliminatedChoicesMap[question.id]?.length ?? 0) > 0)}
                title="3 Yanlış Şıkkı Ele"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  question && (eliminatedChoicesMap[question.id]?.length ?? 0) > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#1c2148] hover:bg-[#252b5e] text-white border border-white/10 active:scale-95'
                }`}
              >
                <span className="text-xs">🎯</span>
                <span>3 Ele</span>
                <span className="bg-amber-400 text-slate-950 px-1 py-0.2 rounded font-black text-[9px]">
                  {user?.jokerEliminateThree ?? 0}
                </span>
              </button>

              {/* Joker 2: Çift Cevap */}
              <button
                onClick={handleUseDoubleChance}
                disabled={jokerLoading || (user?.jokerDoubleChance ?? 0) <= 0 || (question && doubleChanceActiveMap[question.id])}
                title="2 Şık İşaretleme Hakkı"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  question && doubleChanceActiveMap[question.id]
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                    : 'bg-[#1c2148] hover:bg-[#252b5e] text-white border border-white/10 active:scale-95'
                }`}
              >
                <span className="text-xs">✌️</span>
                <span>Çift Hak</span>
                <span className="bg-cyan-400 text-slate-950 px-1 py-0.2 rounded font-black text-[9px]">
                  {user?.jokerDoubleChance ?? 0}
                </span>
              </button>

              {/* Joker 3: +15 Sn Süre */}
              <button
                onClick={handleUseExtraTime}
                disabled={jokerLoading || (user?.jokerExtraTime ?? 0) <= 0}
                title="Sürene +15 Saniye Avantaj Ekle"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-[#1c2148] hover:bg-[#252b5e] text-white border border-white/10 active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="text-xs">⏳</span>
                <span>+15s</span>
                <span className="bg-emerald-400 text-slate-950 px-1 py-0.2 rounded font-black text-[9px]">
                  {user?.jokerExtraTime ?? 0}
                </span>
              </button>
            </div>
          </div>

          <div className="game-card-3d p-4 flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30 mb-2">
                {question.branch}
              </div>
              <p className="text-sm font-semibold text-slate-100 leading-relaxed whitespace-pre-wrap">
                {question.questionText}
              </p>

              {question.imageUrl && (
                <div className="mt-2 mb-2">
                  <img src={question.imageUrl} alt="Soru" className="max-w-full rounded-xl border border-white/10" />
                </div>
              )}
            </div>

            {/* Chunky Choices */}
            <div className="space-y-2.5 pt-3">
              {Object.entries(question?.choices || {})
                .filter(([key]) => !eliminatedChoicesMap[question?.id || '']?.includes(key))
                .map(([key, value]) => {
                  const isDoubleActive = doubleChanceActiveMap[question.id];
                  const isSelected = isDoubleActive
                    ? (selectedDoubleChoicesMap[question.id] || []).includes(key)
                    : answers[question.id] === key;

                  const choiceIndex = isDoubleActive && isSelected
                    ? (selectedDoubleChoicesMap[question.id] || []).indexOf(key) + 1
                    : 0;

                  return (
                    <button
                      key={key}
                      onClick={() => handleAnswer(question.id, key)}
                      className={`w-full text-left p-3.5 rounded-2xl flex items-center font-bold text-xs cursor-pointer select-none transition-all ${
                        isSelected
                          ? 'btn-game-choice selected shadow-lg border-2 border-cyan-400 bg-gradient-to-r from-violet-600/40 to-cyan-500/40'
                          : 'btn-game-choice text-slate-200 hover:border-white/20'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center mr-3 text-xs font-black font-mono shrink-0 transition-colors ${
                        isSelected ? 'bg-cyan-400 text-slate-950 shadow-md font-extrabold' : 'bg-black/30 text-slate-400'
                      }`}>
                        {key}
                      </span>
                      <span className="flex-1 leading-snug text-slate-100">{value}</span>
                      {isDoubleActive && isSelected && (
                        <span className="text-[10px] bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black px-2 py-0.5 rounded-lg ml-2 shrink-0 shadow animate-pulse">
                          {choiceIndex}. Seçim ✓
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="w-1/3 py-3.5 rounded-2xl bg-[#171b38] border border-white/10 text-white font-black text-xs uppercase disabled:opacity-30 cursor-pointer active:scale-95"
            >
              ← Geri
            </button>

            {currentIndex === totalQuestions - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3.5 rounded-2xl btn-game-success text-white font-black text-xs uppercase cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Gönderiliyor...' : 'Sınavı Bitir ✓'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))}
                className="flex-1 py-3.5 rounded-2xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer"
              >
                İleri ➔
              </button>
            )}
          </div>
        </main>

      </div>
    </div>
  );
}
