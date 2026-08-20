import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSoloExam, submitExam, type SoloExam, type SoloQuestion } from '../api/exams';

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
        // Initialize all answers as null (blank)
        const initial: Record<string, string | null> = {};
        data.questions.forEach(q => { initial[q.id] = null; });
        setAnswers(initial);
        setLoading(false);
        // Start client-side timer (display only, server handles actual timing)
        timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
      })
      .catch(() => navigate('/dashboard'));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examId]);

  const handleAnswer = (questionId: string, choice: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: prev[questionId] === choice ? null : choice // Toggle
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--color-text-muted)] text-lg">Sınav yükleniyor...</div>
      </div>
    );
  }

  const question: SoloQuestion = exam.questions[currentIndex];
  const totalQuestions = exam.questions.length;
  const answeredCount = Object.values(answers).filter(a => a !== null).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-surface-light)] px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-primary)]">{exam.title}</h1>
            <span className="text-xs text-[var(--color-text-muted)]">{exam.category}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-[var(--color-accent)]">{formatTime(elapsed)}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Süre</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{answeredCount}/{totalQuestions}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Cevaplanan</div>
            </div>
          </div>
        </div>
      </header>

      {/* Question Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        <div className="bg-[var(--color-surface)] rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm font-semibold px-3 py-1 rounded-full">
              Soru {currentIndex + 1} / {totalQuestions}
            </span>
            <span className="text-[var(--color-text-muted)] text-sm">{question.branch}</span>
          </div>

          {/* Question Text */}
          <p className="text-lg leading-relaxed mb-6 whitespace-pre-wrap">{question.questionText}</p>

          {/* Question Image */}
          {question.imageUrl && (
            <div className="mb-6">
              <img src={question.imageUrl} alt="Question" className="max-w-full rounded-lg" />
            </div>
          )}

          {/* Choices */}
          <div className="space-y-3">
            {Object.entries(question.choices).map(([key, value]) => {
              const isSelected = answers[question.id] === key;
              return (
                <button
                  key={key}
                  onClick={() => handleAnswer(question.id, key)}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition font-medium ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                      : 'border-[var(--color-surface-light)] bg-[var(--color-surface-light)] hover:border-[var(--color-primary)]/50 text-[var(--color-text)]'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 text-sm font-bold ${
                    isSelected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                  }`}>
                    {key}
                  </span>
                  {value}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-6 py-3 bg-[var(--color-surface)] rounded-lg text-[var(--color-text)] disabled:opacity-30 hover:bg-[var(--color-surface-light)] transition"
          >
            ← Önceki
          </button>

          {currentIndex === totalQuestions - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-[var(--color-success)] hover:opacity-90 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {submitting ? 'Gönderiliyor...' : 'Sınavı Bitir ✓'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))}
              className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg transition"
            >
              Sonraki →
            </button>
          )}
        </div>

        {/* Question Navigator Dots */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {exam.questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                i === currentIndex
                  ? 'bg-[var(--color-primary)] text-white'
                  : answers[q.id] !== null
                    ? 'bg-[var(--color-success)]/30 text-[var(--color-success)] border border-[var(--color-success)]/50'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-light)]'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
