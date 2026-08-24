import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSoloExam, submitExam, type SoloExam, type SoloQuestion } from '../api/exams';
import MobileTopHUD from '../components/MobileTopHUD';

export default function ExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<SoloExam | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, [exam, currentIndex, answers]);

  const handleAnswer = (questionId: string, choice: string) => {
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
            <div className="space-y-2 pt-3">
              {Object.entries(question.choices).map(([key, value]) => {
                const isSelected = answers[question.id] === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleAnswer(question.id, key)}
                    className={`w-full text-left p-3 rounded-2xl flex items-center font-bold text-xs cursor-pointer select-none ${
                      isSelected ? 'btn-game-choice selected' : 'btn-game-choice text-slate-200'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center mr-3 text-xs font-black font-mono ${
                      isSelected ? 'bg-white text-purple-900 shadow' : 'bg-black/30 text-slate-400'
                    }`}>
                      {key}
                    </span>
                    <span className="flex-1">{value}</span>
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
