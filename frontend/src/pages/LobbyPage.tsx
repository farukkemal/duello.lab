import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import {
  getRoom,
  type RoomState,
  type RoomUserInfo,
  type MatchStartingData,
  type PlayerProgressData,
  type MatchPlayerResult,
  type MatchEndedData,
  type ZoneShrunkData,
  type PlayerEliminatedData
} from '../api/rooms';
import { type SoloQuestion } from '../api/exams';
import { triggerPodiumConfetti } from '../utils/confetti';
import {
  playCountdownTick,
  playCountdownGo,
  playCorrectSound,
  playWrongSound,
  playVictorySound
} from '../utils/audio';
import MobileTopHUD from '../components/MobileTopHUD';
import EmotePicker from '../components/EmotePicker';
import QuestionReviewModal from '../components/QuestionReviewModal';

type ViewMode = 'lobby' | 'countdown' | 'match' | 'results';

export default function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, refreshUser } = useAuth();
  const { connection, status } = useSignalR();
  const navigate = useNavigate();

  // Core state
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('lobby');

  // Match / Gameplay state
  const [countdownValue, setCountdownValue] = useState<number>(3);
  const [questions, setQuestions] = useState<SoloQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [playerProgressMap, setPlayerProgressMap] = useState<Record<string, PlayerProgressData>>({});
  const [matchStartTime, setMatchStartTime] = useState<Date | null>(null);
  const [matchDurationSeconds, setMatchDurationSeconds] = useState(300);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Elimination state (Battleground & Sudden Death)
  const [isEliminated, setIsEliminated] = useState(false);
  const [eliminationReason, setEliminationReason] = useState<string>('');
  const [zoneAlert, setZoneAlert] = useState<string | null>(null);

  // Results & Podium state
  const [myResult, setMyResult] = useState<MatchPlayerResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<MatchPlayerResult[]>([]);

  // UI state
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!roomCode) {
      navigate('/dashboard');
      return;
    }

    getRoom(roomCode)
      .then(({ data }) => {
        setRoom(data);
        if (data.durationSeconds) setMatchDurationSeconds(data.durationSeconds);
        if (data.status === 'InProgress' && data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          if (data.startTime) setMatchStartTime(new Date(data.startTime));
          setViewMode('match');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Room fetch error:', err);
        setError(err.response?.data?.error || 'Oda bulunamadı veya süresi dolmuş.');
        setLoading(false);
      });
  }, [roomCode, navigate]);

  // SignalR events
  useEffect(() => {
    if (!connection || status !== 'connected' || !roomCode) return;

    connection.invoke('JoinLobby', roomCode).catch((err) => {
      console.error('JoinLobby invoke failed:', err);
    });

    const handleLobbyState = (state: any) => {
      const usersList: RoomUserInfo[] = Array.isArray(state.users)
        ? state.users
        : Object.values(state.users || {});

      setRoom({ ...state, users: usersList });

      if (state.status === 2 || state.status === 'InProgress') {
        if (state.questions && state.questions.length > 0) {
          setQuestions(state.questions);
        }
        if (state.startTime) {
          setMatchStartTime(new Date(state.startTime));
        }
        if (state.durationSeconds) {
          setMatchDurationSeconds(state.durationSeconds);
        }
        setViewMode('match');
      }
    };

    const handleUserJoined = (data: { user: RoomUserInfo; room: any }) => {
      showToast(`🎉 ${data.user.username} katıldı!`);
      const usersList: RoomUserInfo[] = Array.isArray(data.room.users)
        ? data.room.users
        : Object.values(data.room.users || {});
      setRoom({ ...data.room, users: usersList });
    };

    const handleUserLeft = (data: { userId: string; username: string; room?: any }) => {
      showToast(`👋 ${data.username} ayrıldı.`);
      if (data.room) {
        const usersList: RoomUserInfo[] = Array.isArray(data.room.users)
          ? data.room.users
          : Object.values(data.room.users || {});
        setRoom({ ...data.room, users: usersList });
      } else {
        navigate('/dashboard');
      }
    };

    const handleReadyChanged = (data: { userId: string; isReady: boolean; room: any }) => {
      const usersList: RoomUserInfo[] = Array.isArray(data.room.users)
        ? data.room.users
        : Object.values(data.room.users || {});
      setRoom({ ...data.room, users: usersList });
    };

    const handleMatchStarting = (data: MatchStartingData) => {
      setQuestions(data.questions);
      if (data.durationSeconds) setMatchDurationSeconds(data.durationSeconds);
      const initialAnswers: Record<string, string | null> = {};
      data.questions.forEach(q => { initialAnswers[q.id] = null; });
      setAnswers(initialAnswers);
      setMatchStartTime(new Date(data.startTime));
      autoSubmittedRef.current = false;
      setIsEliminated(false);

      const initialProgress: Record<string, PlayerProgressData> = {};
      room?.users.forEach(u => {
        initialProgress[u.userId] = {
          userId: u.userId,
          username: u.username,
          currentQuestionIndex: 0,
          answeredCount: 0,
          progressPercentage: 0,
          team: u.team
        };
      });
      setPlayerProgressMap(initialProgress);

      setViewMode('countdown');
      let cd = data.countdownSeconds || 3;
      setCountdownValue(cd);
      playCountdownTick();

      const cdInterval = setInterval(() => {
        cd -= 1;
        if (cd <= 0) {
          clearInterval(cdInterval);
          playCountdownGo();
          setViewMode('match');
        } else {
          playCountdownTick();
          setCountdownValue(cd);
        }
      }, 1000);
    };

    const handlePlayerProgress = (data: PlayerProgressData) => {
      setPlayerProgressMap(prev => ({
        ...prev,
        [data.userId]: data
      }));
    };

    const handlePlayerEliminated = (data: PlayerEliminatedData) => {
      showToast(`💀 ${data.username} elendi! (${data.reason})`);
      if (data.userId === user?.id) {
        playWrongSound();
        setIsEliminated(true);
        setEliminationReason(data.reason);
      }
    };

    const handleZoneShrunk = (data: ZoneShrunkData) => {
      setZoneAlert(data.message);
      showToast(data.message);
      if (data.eliminatedUserIds.includes(user?.id ?? '')) {
        playWrongSound();
        setIsEliminated(true);
        setEliminationReason('Alan Dışında Kaldın 💀');
      }
      setTimeout(() => setZoneAlert(null), 5000);
    };

    const handlePlayerFinished = (data: any) => {
      showToast(`🏁 ${data.username} bitirdi!`);
    };

    const handleMatchEnded = (data: MatchEndedData) => {
      setLeaderboard(data.leaderboard);
      const me = data.leaderboard.find(p => p.userId === user?.id);
      if (me) setMyResult(me);
      setViewMode('results');
      refreshUser();
      playVictorySound();
      triggerPodiumConfetti();
    };

    const handleLobbyError = (errMsg: string) => {
      setError(errMsg);
    };

    connection.on('LobbyState', handleLobbyState);
    connection.on('UserJoinedLobby', handleUserJoined);
    connection.on('UserLeftLobby', handleUserLeft);
    connection.on('UserReadyChanged', handleReadyChanged);
    connection.on('MatchStarting', handleMatchStarting);
    connection.on('PlayerProgressUpdated', handlePlayerProgress);
    connection.on('PlayerEliminated', handlePlayerEliminated);
    connection.on('ZoneShrunk', handleZoneShrunk);
    connection.on('PlayerFinished', handlePlayerFinished);
    connection.on('MatchEnded', handleMatchEnded);
    connection.on('LobbyError', handleLobbyError);

    return () => {
      connection.off('LobbyState', handleLobbyState);
      connection.off('UserJoinedLobby', handleUserJoined);
      connection.off('UserLeftLobby', handleUserLeft);
      connection.off('UserReadyChanged', handleReadyChanged);
      connection.off('MatchStarting', handleMatchStarting);
      connection.off('PlayerProgressUpdated', handlePlayerProgress);
      connection.off('PlayerEliminated', handlePlayerEliminated);
      connection.off('ZoneShrunk', handleZoneShrunk);
      connection.off('PlayerFinished', handlePlayerFinished);
      connection.off('MatchEnded', handleMatchEnded);
      connection.off('LobbyError', handleLobbyError);
    };
  }, [connection, status, roomCode, room?.users, user?.id, navigate, refreshUser]);

  // Timer Interval
  useEffect(() => {
    if (viewMode === 'match' && matchStartTime) {
      timerIntervalRef.current = setInterval(() => {
        const now = new Date();
        const diffSec = Math.max(0, Math.floor((now.getTime() - matchStartTime.getTime()) / 1000));
        setElapsedSeconds(diffSec);

        if (matchDurationSeconds > 0 && diffSec >= matchDurationSeconds && !autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          handleAutoSubmitOnTimeUp();
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [viewMode, matchStartTime, matchDurationSeconds]);

  const handleAutoSubmitOnTimeUp = async () => {
    if (!connection || !roomCode) return;
    try {
      const payload = Object.entries(answers).map(([qId, choice]) => ({
        questionId: qId,
        selectedAnswer: choice
      }));
      await connection.invoke('SubmitMatch', roomCode, payload);
      await connection.invoke('ForceTimeUp', roomCode);
    } catch (e) {
      console.warn('Auto submit fallback:', e);
    }
  };

  const handleStartMatch = async () => {
    if (!connection || !roomCode) return;
    try {
      await connection.invoke('StartMatch', roomCode);
    } catch (e: any) {
      alert(e.message || 'Savaş başlatılamadı.');
    }
  };

  const handleToggleReady = async () => {
    if (!connection || !roomCode) return;
    try {
      await connection.invoke('ToggleReady', roomCode);
    } catch (e) {
      console.error('ToggleReady error:', e);
    }
  };

  const handleSelectChoice = (questionId: string, choiceKey: string) => {
    if (isEliminated) return;

    const newChoice = answers[questionId] === choiceKey ? null : choiceKey;
    const newAnswers = {
      ...answers,
      [questionId]: newChoice
    };
    setAnswers(newAnswers);

    const answeredCount = Object.values(newAnswers).filter(a => a !== null).length;

    if (connection && roomCode && connection.state === 'Connected') {
      connection.invoke('UpdateProgress', roomCode, currentQuestionIndex, answeredCount, questionId, newChoice).catch(() => {});

      // If Sudden Death mode, test answer immediately
      if (room?.mode === 3 && newChoice) {
        connection.invoke('SubmitSuddenDeathAnswer', roomCode, questionId, newChoice).catch(() => {});
      }
    }
  };

  const handleNavigateQuestion = (newIndex: number) => {
    setCurrentQuestionIndex(newIndex);
    const answeredCount = Object.values(answers).filter(a => a !== null).length;
    if (connection && roomCode && connection.state === 'Connected') {
      connection.invoke('UpdateProgress', roomCode, newIndex, answeredCount, null, null).catch(() => {});
    }
  };

  const handleSubmitMatch = async () => {
    if (!connection || !roomCode) return;
    if (!confirm('Sınavı bitirmek istediğinize emin misiniz?')) return;

    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([qId, choice]) => ({
        questionId: qId,
        selectedAnswer: choice
      }));

      await connection.invoke('SubmitMatch', roomCode, payload);
      setViewMode('results');
    } catch (e: any) {
      alert(e.message || 'Sınav gönderilirken hata oluştu.');
      setSubmitting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!confirm('Lobiden ayrılmak istediğinize emin misiniz?')) return;
    if (connection && roomCode && connection.state === 'Connected') {
      try {
        await connection.invoke('LeaveLobby', roomCode);
      } catch (e) {
        console.error('LeaveLobby error:', e);
      }
    }
    navigate('/dashboard');
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#060710] flex justify-center items-center">
        <div className="w-full max-w-md mobile-app-shell flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-white font-black text-sm">Lobiye Bağlanılıyor...</div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error || !room) {
    return (
      <div className="min-h-screen bg-[#060710] flex justify-center items-center p-4">
        <div className="w-full max-w-md mobile-app-shell flex flex-col items-center justify-center p-6 text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h3 className="text-xl font-black text-white mb-1">Lobi Bulunamadı</h3>
          <p className="text-xs text-slate-400 mb-6">{error || 'Oda kapandı veya süresi doldu.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 rounded-2xl btn-game-primary text-white font-black text-sm uppercase cursor-pointer"
          >
            Ana Menüye Dön
          </button>
        </div>
      </div>
    );
  }

  const isHost = user?.id === room.hostUserId;
  const currentParticipant = room.users.find(u => u.userId === user?.id);
  const isReady = isHost ? true : (currentParticipant?.isReady ?? false);
  const totalQuestions = questions.length > 0 ? questions.length : room.questionCount;
  const currentQuestion = questions[currentQuestionIndex];
  const myAnsweredCount = Object.values(answers).filter(a => a !== null).length;
  const remainingSeconds = Math.max(0, matchDurationSeconds - elapsedSeconds);

  return (
    <div className="min-h-screen bg-[#060710] flex justify-center">
      <div className="w-full max-w-md mobile-app-shell flex flex-col justify-between relative overflow-hidden">
        
        {/* Top Game HUD */}
        <MobileTopHUD />

        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-violet-600 to-purple-600 border border-white/20 text-white px-4 py-2 rounded-2xl shadow-2xl text-xs font-black animate-bounce whitespace-nowrap">
            {toastMessage}
          </div>
        )}

        {/* ==========================================
            VIEW 1: COUNTDOWN OVERLAY
            ========================================== */}
        {viewMode === 'countdown' && (
          <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fadeIn">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-black uppercase tracking-widest animate-pulse">
              ⚔️ DÜELLO BAŞLIYOR!
            </div>

            <h2 className="text-2xl font-black text-white">{room.title}</h2>

            <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-tr from-violet-600 to-cyan-400 p-1 shadow-2xl animate-bounce-subtle">
              <div className="w-full h-full bg-[#0d0f22] rounded-full flex items-center justify-center">
                <span className="text-7xl font-black text-white font-mono">
                  {countdownValue > 0 ? countdownValue : '🔥'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-bold">
              Hazırlan! İlk soru ekrana yükleniyor...
            </p>
          </main>
        )}

        {/* ==========================================
            VIEW 2: MATCH RESULTS & 3D PODIUM
            ========================================== */}
        {viewMode === 'results' && (
          <main className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-4 animate-fadeIn">
            <div className="text-center pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-2">
                🏆 SAVAŞ SONA ERDİ
              </div>
              <h2 className="text-xl font-black text-white">{room.title}</h2>
            </div>

            {/* Mobile 3D Podium Block */}
            <div className="game-card-3d p-4 pt-8">
              <div className="flex items-end justify-center gap-2 max-w-xs mx-auto">
                {leaderboard[1] && (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="text-2xl mb-1">🥈</div>
                    <div className="text-[10px] font-bold text-white truncate max-w-[70px]">{leaderboard[1].username}</div>
                    <div className="text-[9px] font-mono text-cyan-400 font-bold mb-1">{leaderboard[1].netScore.toFixed(1)} N</div>
                    <div className="w-full bg-slate-600/40 border-t-2 border-slate-400 rounded-t-xl h-24 flex flex-col items-center justify-center">
                      <span className="font-black text-slate-200 text-lg">2</span>
                      <span className="text-[8px] text-slate-300 font-bold">+{leaderboard[1].coinsGained} 💰</span>
                    </div>
                  </div>
                )}

                {leaderboard[0] && (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="text-3xl mb-1 animate-bounce-subtle">👑</div>
                    <div className="text-xs font-black text-amber-300 truncate max-w-[80px]">{leaderboard[0].username}</div>
                    <div className="text-[10px] font-mono text-emerald-400 font-black mb-1">{leaderboard[0].netScore.toFixed(1)} N</div>
                    <div className="w-full bg-amber-500/30 border-t-2 border-amber-400 rounded-t-xl h-36 flex flex-col items-center justify-center">
                      <span className="font-black text-amber-300 text-2xl">1</span>
                      <span className="text-[9px] text-amber-200 font-black">+{leaderboard[0].coinsGained} 💰</span>
                    </div>
                  </div>
                )}

                {leaderboard[2] && (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="text-2xl mb-1">🥉</div>
                    <div className="text-[10px] font-bold text-white truncate max-w-[70px]">{leaderboard[2].username}</div>
                    <div className="text-[9px] font-mono text-cyan-400 font-bold mb-1">{leaderboard[2].netScore.toFixed(1)} N</div>
                    <div className="w-full bg-amber-900/40 border-t-2 border-amber-700 rounded-t-xl h-18 flex flex-col items-center justify-center">
                      <span className="font-black text-amber-600 text-base">3</span>
                      <span className="text-[8px] text-amber-500 font-bold">+{leaderboard[2].coinsGained} 💰</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {myResult && (
              <div className="bg-[#171b38] border-2 border-violet-500 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                <div>
                  <div className="text-[10px] text-violet-400 font-bold uppercase">Senin Derecen</div>
                  <div className="text-lg font-black text-white font-mono">Sıralama: #{myResult.rank}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {myResult.correctCount}D • {myResult.wrongCount}Y • {myResult.blankCount}B • {(myResult.durationMs / 1000).toFixed(1)}s
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="bg-violet-600/30 border border-violet-500/40 px-2.5 py-1.5 rounded-xl text-center">
                    <div className="text-[8px] text-slate-400 font-bold">XP</div>
                    <div className="text-xs font-black text-violet-300 font-mono">+{myResult.xpGained}</div>
                  </div>
                  <div className="bg-amber-500/20 border border-amber-500/40 px-2.5 py-1.5 rounded-xl text-center">
                    <div className="text-[8px] text-slate-400 font-bold">Coin</div>
                    <div className="text-xs font-black text-amber-300 font-mono">+{myResult.coinsGained} 💰</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-black text-slate-300 px-1">Tüm Oyuncular</div>
              {leaderboard.map((p, idx) => (
                <div
                  key={p.userId}
                  className={`p-3 rounded-2xl border flex items-center justify-between ${
                    p.userId === user?.id ? 'bg-violet-950/40 border-violet-500' : 'bg-[#171b38] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-black text-base w-6 text-center">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{p.username}</span>
                        {p.isEliminated && <span className="text-[8px] bg-rose-600 text-white px-1 rounded font-bold">ELENDİ</span>}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {(p.durationMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-400 font-mono">{p.netScore.toFixed(1)} Net</div>
                    <div className="text-[9px] text-amber-300 font-bold">+{p.coinsGained} 💰</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full py-3.5 rounded-2xl btn-game-gold font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
              >
                <span>🔍 Yanlışlarımı İncele & Çözüm Analizi</span>
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3.5 rounded-2xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer"
              >
                Ana Menüye Dön 🏠
              </button>
            </div>
          </main>
        )}

        {/* ==========================================
            VIEW 3: LIVE MULTIPLAYER GAMEPLAY
            ========================================== */}
        {viewMode === 'match' && (
          <main className="flex-1 p-3.5 flex flex-col justify-between space-y-3 animate-fadeIn">
            
            {/* Safe Zone Alert Banner */}
            {zoneAlert && (
              <div className="bg-rose-600 text-white text-xs font-black p-2.5 rounded-2xl text-center animate-pulse border border-rose-300 shadow-xl">
                {zoneAlert}
              </div>
            )}

            {/* Elimination Overlay */}
            {isEliminated && (
              <div className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-3 text-center space-y-1 animate-bounce">
                <div className="text-xl">💀 ELENDİN!</div>
                <div className="text-[11px] text-rose-200 font-bold">{eliminationReason || 'Mücadele dışı kaldın.'}</div>
                <div className="text-[9px] text-slate-400">Diğer oyuncuları izleyebilirsin.</div>
              </div>
            )}

            {/* Top VS Battle Progress Bar */}
            <div className="game-card-3d p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-black">
                <span className="text-white flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Soru {currentQuestionIndex + 1} / {totalQuestions}
                </span>

                <div className={`px-2.5 py-0.5 rounded-lg font-mono font-black ${
                  remainingSeconds < 30 ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/10 text-cyan-400'
                }`}>
                  ⏱️ {formatTimer(remainingSeconds)}
                </div>
              </div>

              {/* Progress Tracks */}
              <div className="space-y-1.5 pt-1">
                {room.users.map((p) => {
                  const isMe = p.userId === user?.id;
                  const prog = playerProgressMap[p.userId] || {
                    currentQuestionIndex: p.currentQuestionIndex || 0,
                    answeredCount: p.answeredCount || 0,
                    progressPercentage: p.progressPercentage || 0,
                    team: p.team
                  };
                  const percentage = isMe
                    ? (totalQuestions > 0 ? Math.round((myAnsweredCount / totalQuestions) * 100) : 0)
                    : prog.progressPercentage;

                  return (
                    <div key={p.userId} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={`flex items-center gap-1 ${isMe ? 'text-violet-300' : 'text-slate-300'}`}>
                          {p.team && (
                            <span className={`text-[8px] px-1 py-0.2 rounded font-black ${p.team === 'Red' ? 'bg-rose-600 text-white' : 'bg-cyan-600 text-white'}`}>
                              {p.team}
                            </span>
                          )}
                          <span>{p.username} {isMe && '(SEN)'}</span>
                        </span>
                        <span className="font-mono text-cyan-400">{percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            p.team === 'Blue' ? 'bg-cyan-400' : isMe ? 'bg-gradient-to-r from-violet-500 to-cyan-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question Text Box */}
            {currentQuestion ? (
              <div className="game-card-3d p-4 flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar space-y-3">
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30 mb-2">
                    {currentQuestion.branch}
                  </div>
                  <p className="text-sm font-semibold text-slate-100 leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.questionText}
                  </p>

                  {currentQuestion.imageUrl && (
                    <div className="mt-2 mb-2">
                      <img src={currentQuestion.imageUrl} alt="Soru" className="max-w-full rounded-xl border border-white/10" />
                    </div>
                  )}
                </div>

                {/* Choices */}
                <div className="space-y-2 pt-2">
                  {Object.entries(currentQuestion.choices).map(([key, text]) => {
                    const isSelected = answers[currentQuestion.id] === key;

                    return (
                      <button
                        key={key}
                        disabled={isEliminated}
                        onClick={() => handleSelectChoice(currentQuestion.id, key)}
                        className={`w-full text-left p-3 rounded-2xl flex items-center font-bold text-xs cursor-pointer select-none disabled:opacity-40 ${
                          isSelected ? 'btn-game-choice selected' : 'btn-game-choice text-slate-200'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center mr-3 text-xs font-black font-mono ${
                          isSelected ? 'bg-white text-purple-900 shadow' : 'bg-black/30 text-slate-400'
                        }`}>
                          {key}
                        </span>
                        <span className="flex-1">{text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">Soru bulunamadı.</div>
            )}

            {/* Bottom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavigateQuestion(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="w-1/3 py-3.5 rounded-2xl bg-[#171b38] border border-white/10 text-white font-black text-xs uppercase disabled:opacity-30 cursor-pointer active:scale-95"
              >
                ← Geri
              </button>

              {currentQuestionIndex === totalQuestions - 1 ? (
                <button
                  onClick={handleSubmitMatch}
                  disabled={submitting || isEliminated}
                  className="flex-1 py-3.5 rounded-2xl btn-game-success text-white font-black text-xs uppercase cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Gönderiliyor...' : 'Sınavı Bitir ✓'}
                </button>
              ) : (
                <button
                  onClick={() => handleNavigateQuestion(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                  className="flex-1 py-3.5 rounded-2xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer"
                >
                  İleri ➔
                </button>
              )}
            </div>

          </main>
        )}

        {/* ==========================================
            VIEW 4: DEFAULT LOBBY ROOM VIEW
            ========================================== */}
        {viewMode === 'lobby' && (
          <main className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-4 animate-fadeIn">
            
            <div className="game-card-3d p-4 text-center space-y-2">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                LOBİ KODU
              </div>
              <div className="text-4xl font-mono font-black text-violet-300 tracking-widest">
                {room.roomCode}
              </div>
              <div className="flex gap-2 justify-center pt-1">
                <button
                  onClick={copyCode}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer active:scale-95"
                >
                  {copiedCode ? '✓ Kopyalandı' : '📋 Kodu Kopyala'}
                </button>
              </div>
            </div>

            <div className="bg-[#171b38] border border-white/10 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div>
                <div className="font-black text-white">{room.title}</div>
                <div className="text-[10px] text-slate-400">{room.category} • {room.questionCount} Soru</div>
              </div>
              <div className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                Lider: {room.hostUsername}
              </div>
            </div>

            {/* Players List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black px-1">
                <span className="text-white">Oyuncular ({room.users.length}/{room.maxPlayers})</span>
                <span className="text-slate-400 text-[10px]">⚡ Anlık Senkron</span>
              </div>

              {room.users.map((participant) => {
                const isUserHost = participant.userId === room.hostUserId || participant.isHost;
                const isMe = participant.userId === user?.id;

                return (
                  <div
                    key={participant.userId}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      isMe ? 'bg-violet-950/40 border-violet-500' : 'bg-[#171b38] border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1.5px] relative">
                        <div className="w-full h-full bg-[#0d0f22] rounded-[10px] flex items-center justify-center font-black text-white text-sm font-mono">
                          {participant.isBot ? '🤖' : participant.username.charAt(0).toUpperCase()}
                        </div>
                        {isUserHost && (
                          <span className="absolute -top-1.5 -right-1.5 text-xs drop-shadow">👑</span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>{participant.username}</span>
                          {participant.team && (
                            <span className={`text-[8px] px-1 py-0.2 rounded font-black ${participant.team === 'Red' ? 'bg-rose-600 text-white' : 'bg-cyan-600 text-white'}`}>
                              {participant.team}
                            </span>
                          )}
                          {isMe && <span className="text-[8px] bg-violet-600 text-white px-1 py-0.2 rounded font-black">SEN</span>}
                          {participant.isBot && (
                            <span className="text-[8px] bg-slate-600/80 text-slate-200 border border-slate-500/40 px-1 py-0.2 rounded font-black">🤖 BOT</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">Seviye {participant.level || 1}</div>
                      </div>
                    </div>

                    <div>
                      {isUserHost ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-lg">
                          👑 Host
                        </span>
                      ) : participant.isReady ? (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Hazır
                        </span>
                      ) : (
                        <span className="bg-white/5 text-slate-400 border border-white/10 text-[10px] font-semibold px-2 py-0.5 rounded-lg">
                          Bekliyor
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 space-y-2">
              {isHost ? (
                <button
                  onClick={handleStartMatch}
                  className="w-full py-4 rounded-2xl btn-game-gold font-black text-sm uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>⚔️ Savaşı Başlat</span>
                  <span className="text-xs bg-black/25 px-2 py-0.5 rounded-md font-mono text-white">
                    {room.users.length} Oyuncu
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleToggleReady}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 cursor-pointer ${
                    isReady
                      ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-500/50'
                      : 'btn-game-primary text-white'
                  }`}
                >
                  {isReady ? '⚪ Hazır Değilim' : '🟢 Hazırım!'}
                </button>
              )}

              <button
                onClick={handleLeaveRoom}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 font-bold text-xs uppercase cursor-pointer"
              >
                Lobiden Ayrıl
              </button>
            </div>

          </main>
        )}

        {/* Live In-Game Emote Picker */}
        <EmotePicker roomCode={room.roomCode} />

        {/* Question Review & Solution Modal */}
        <QuestionReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          answers={answers}
          fallbackQuestions={questions}
        />

      </div>
    </div>
  );
}
