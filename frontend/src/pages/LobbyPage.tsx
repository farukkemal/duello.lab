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
  type PlayerFinishedData,
  type MatchPlayerResult,
  type MatchEndedData
} from '../api/rooms';
import { type SoloQuestion } from '../api/exams';
import LiveStatusBadge from '../components/LiveStatusBadge';

type ViewMode = 'lobby' | 'countdown' | 'match' | 'waiting' | 'results';

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

  // Results & Podium state (FAZ 2.4)
  const [myResult, setMyResult] = useState<MatchPlayerResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<MatchPlayerResult[]>([]);

  // UI state
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);


  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial REST fetch for Room metadata
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

  // 2. SignalR Lobby & Gameplay events
  useEffect(() => {
    if (!connection || status !== 'connected' || !roomCode) return;

    connection.invoke('JoinLobby', roomCode).catch((err) => {
      console.error('JoinLobby invoke failed:', err);
    });

    const handleLobbyState = (state: any) => {
      console.log('🏛️ [Lobby] Full state received:', state);
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
      console.log('👤 [Lobby] User joined:', data);
      showToast(`🎉 ${data.user.username} odaya katıldı!`);
      const usersList: RoomUserInfo[] = Array.isArray(data.room.users)
        ? data.room.users
        : Object.values(data.room.users || {});
      setRoom({ ...data.room, users: usersList });
    };

    const handleUserLeft = (data: { userId: string; username: string; room?: any }) => {
      console.log('🚪 [Lobby] User left:', data);
      showToast(`👋 ${data.username} odadan ayrıldı.`);
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
      console.log('⚡ [Lobby] Ready changed:', data);
      const usersList: RoomUserInfo[] = Array.isArray(data.room.users)
        ? data.room.users
        : Object.values(data.room.users || {});
      setRoom({ ...data.room, users: usersList });
    };

    // ==========================================
    // FAZ 2.3 & 2.4 Gameplay & Podium Events
    // ==========================================

    const handleMatchStarting = (data: MatchStartingData) => {
      console.log('⚔️ [Gameplay] Match starting! Countdown initiated:', data);
      setQuestions(data.questions);
      if (data.durationSeconds) setMatchDurationSeconds(data.durationSeconds);
      const initialAnswers: Record<string, string | null> = {};
      data.questions.forEach(q => { initialAnswers[q.id] = null; });
      setAnswers(initialAnswers);
      setMatchStartTime(new Date(data.startTime));
      autoSubmittedRef.current = false;

      const initialProgress: Record<string, PlayerProgressData> = {};
      room?.users.forEach(u => {
        initialProgress[u.userId] = {
          userId: u.userId,
          username: u.username,
          currentQuestionIndex: 0,
          answeredCount: 0,
          progressPercentage: 0
        };
      });
      setPlayerProgressMap(initialProgress);

      setViewMode('countdown');
      let cd = data.countdownSeconds || 3;
      setCountdownValue(cd);

      const cdInterval = setInterval(() => {
        cd -= 1;
        if (cd <= 0) {
          clearInterval(cdInterval);
          setViewMode('match');
        } else {
          setCountdownValue(cd);
        }
      }, 1000);
    };

    const handlePlayerProgress = (data: PlayerProgressData) => {
      console.log('📊 [Gameplay] Player progress update:', data);
      setPlayerProgressMap(prev => ({
        ...prev,
        [data.userId]: data
      }));
    };
    const handlePlayerFinished = (data: PlayerFinishedData) => {
      console.log('🏁 [Gameplay] Player finished:', data);

      showToast(`🏁 ${data.username} sınavı tamamladı.`);

      setRoom(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          users: prev.users.map(roomUser =>
            roomUser.userId === data.userId
              ? { ...roomUser, isFinished: true }
              : roomUser
          )
        };
      });
    };

    const handleMatchEnded = (data: MatchEndedData) => {
      console.log('🏆 [Podium] Match ended! Final podium and leaderboard:', data);
      setLeaderboard(data.leaderboard);
      const me = data.leaderboard.find(p => p.userId === user?.id);
      if (me) setMyResult(me);
      setViewMode('results');
      refreshUser();
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
      connection.off('PlayerFinished', handlePlayerFinished);
      connection.off('MatchEnded', handleMatchEnded);
      connection.off('LobbyError', handleLobbyError);
    };
  }, [connection, status, roomCode, room?.users, user?.id, navigate, refreshUser]);

  // Synchronized Server Elapsed & Countdown Timer
  useEffect(() => {
    if (
      (viewMode === 'match' || viewMode === 'waiting') &&
      matchStartTime
    ) {
      timerIntervalRef.current = setInterval(() => {
        const now = new Date();
        const diffSec = Math.max(0, Math.floor((now.getTime() - matchStartTime.getTime()) / 1000));
        setElapsedSeconds(diffSec);

        // Auto time-up trigger
        if (matchDurationSeconds > 0 && diffSec >= matchDurationSeconds && !autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          console.log('⏰ Time limit reached. Auto submitting match...');
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

  // Auto-submit when time expires
  const handleAutoSubmitOnTimeUp = async () => {
    if (!connection || !roomCode) return;

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await connection.invoke('ForceTimeUp', roomCode);
        return;
      } catch (e) {
        if (attempt === maxAttempts) {
          console.warn(
            'ForceTimeUp failed after all retry attempts:',
            e
          );
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 750));
      }
    }
  };

  // Handle Start Match (Host Action)
  const handleStartMatch = async () => {
    if (!connection || !roomCode) return;
    try {
      await connection.invoke('StartMatch', roomCode);
    } catch (e: any) {
      alert(e.message || 'Savaş başlatılamadı.');
    }
  };

  // Handle Toggle Ready (Participant Action)
  const handleToggleReady = async () => {
    if (!connection || !roomCode) return;
    try {
      await connection.invoke('ToggleReady', roomCode);
    } catch (e) {
      console.error('ToggleReady error:', e);
    }
  };

  // Handle Choice Selection & Live Progress
  const handleSelectChoice = (questionId: string, choiceKey: string) => {
    const newChoice = answers[questionId] === choiceKey ? null : choiceKey;
    const newAnswers = {
      ...answers,
      [questionId]: newChoice
    };
    setAnswers(newAnswers);

    const answeredCount = Object.values(newAnswers).filter(a => a !== null).length;

    if (connection && roomCode && connection.state === 'Connected') {
      connection.invoke('UpdateProgress', roomCode, currentQuestionIndex, answeredCount, questionId, newChoice).catch(() => { });
    }
  };

  const handleNavigateQuestion = (newIndex: number) => {
    setCurrentQuestionIndex(newIndex);
    const answeredCount = Object.values(answers).filter(a => a !== null).length;
    if (connection && roomCode && connection.state === 'Connected') {
      connection.invoke('UpdateProgress', roomCode, newIndex, answeredCount, null, null).catch(() => { });
    }
  };

  // Handle Manual Match Submit
  const handleSubmitMatch = async () => {
    if (!connection || !roomCode || submitting) return;

    const confirmed = confirm(
      'Sınavı bitirmek istediğinize emin misiniz?\n\n' +
      'Bitirdikten sonra cevaplarınızı değiştiremezsiniz.'
    );

    if (!confirmed) return;

    setSubmitting(true);
    setViewMode('waiting');

    try {
      const payload = Object.entries(answers).map(([qId, choice]) => ({
        questionId: qId,
        selectedAnswer: choice
      }));

      await connection.invoke('SubmitMatch', roomCode, payload);
    } catch (e: any) {
      setSubmitting(false);
      setViewMode('match');

      alert(e.message || 'Sınav gönderilirken bir hata oluştu.');
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

  const copyInviteLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--color-text-muted)] text-lg animate-pulse">Lobi yükleniyor...</div>
      </div>
    );
  }

  // Error Screen
  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[var(--color-surface)] max-w-md w-full rounded-2xl p-8 text-center shadow-xl">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Lobiye Ulaşılamadı</h2>
          <p className="text-[var(--color-text-muted)] mb-6 text-sm">{error || 'Oda bulunamadı veya süresi doldu.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white py-3 rounded-xl font-semibold transition cursor-pointer"
          >
            Dashboard'a Dön
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
  const finishedPlayers = room.users.filter(player => player.isFinished);
  const finishedPlayerCount = finishedPlayers.length;
  const totalPlayerCount = room.users.length;

  // ==========================================
  // VIEW: 3-2-1 COUNTDOWN OVERLAY
  // ==========================================
  if (viewMode === 'countdown') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/10 to-transparent pointer-events-none" />
        <div className="text-center z-10 px-4">
          <div className="text-sm uppercase tracking-widest text-[var(--color-primary)] font-bold mb-4">
            ⚔️ Düello Başlıyor!
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-8">{room.title}</h1>
          <div className="w-40 h-40 mx-auto rounded-full bg-[var(--color-surface)] border-4 border-[var(--color-primary)] flex items-center justify-center shadow-2xl shadow-[var(--color-primary)]/40 animate-pulse">
            <span className="text-7xl font-black text-[var(--color-primary)] font-mono">
              {countdownValue > 0 ? countdownValue : '🔥'}
            </span>
          </div>
          <p className="text-[var(--color-text-muted)] text-sm mt-8 animate-bounce">
            Hazırlan, ilk soru yükleniyor...
          </p>
        </div>
      </div>
    );
  }
  // ==========================================
  // VIEW: WAITING FOR OTHER PLAYERS
  // ==========================================
  if (viewMode === 'waiting') {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-[var(--color-surface)] rounded-3xl shadow-xl p-6 md:p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">✅</div>

            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Sınavın tamamlandı
            </h1>

            <p className="text-[var(--color-text-muted)]">
              Diğer oyuncuların sınavı bitirmesi bekleniyor.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl bg-[var(--color-bg)] p-4 text-center">
              <div className="text-sm text-[var(--color-text-muted)] mb-1">
                Kalan süre
              </div>

              <div className="text-2xl font-bold text-[var(--color-primary)]">
                {formatTimer(remainingSeconds)}
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--color-bg)] p-4 text-center">
              <div className="text-sm text-[var(--color-text-muted)] mb-1">
                Tamamlayanlar
              </div>

              <div className="text-2xl font-bold">
                {finishedPlayerCount}/{totalPlayerCount}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {room.users.map(player => (
              <div
                key={player.userId}
                className="flex items-center justify-between rounded-xl border border-white/10 p-4"
              >
                <div>
                  <div className="font-semibold">
                    {player.username}
                    {player.userId === user?.id ? ' (Sen)' : ''}
                  </div>

                  <div className="text-sm text-[var(--color-text-muted)]">
                    Seviye {player.level}
                  </div>
                </div>

                {player.isFinished ? (
                  <span className="rounded-full bg-green-500/15 text-green-500 px-3 py-1 text-sm font-semibold">
                    Tamamladı
                  </span>
                ) : (
                  <span className="rounded-full bg-yellow-500/15 text-yellow-500 px-3 py-1 text-sm font-semibold animate-pulse">
                    Devam ediyor
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-[var(--color-text-muted)]">
            <div className="w-4 h-4 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
            Maç tamamlandığında sonuçlar otomatik açılacak.
          </div>
        </div>
      </div>
    );
  }
  // ==========================================
  // VIEW: FAZ 2.4 3D-STYLE PODIUM & REWARDS
  // ==========================================
  if (viewMode === 'results') {
    const sortedLeaderboard = leaderboard.length > 0
      ? leaderboard
      : room.users.map(u => ({
        userId: u.userId,
        username: u.username,
        level: u.level || 1,
        rank: u.rank || 1,
        netScore: u.netScore || 0,
        durationMs: u.durationMs || 0,
        correctCount: u.correctCount || 0,
        wrongCount: u.wrongCount || 0,
        blankCount: u.blankCount || 0,
        xpGained: u.xpGained || 0,
        coinsGained: u.coinsGained || 0,
        isFinished: u.isFinished || false
      })).sort((a, b) => b.netScore - a.netScore || a.durationMs - b.durationMs);

    const firstPlace = sortedLeaderboard[0];
    const secondPlace = sortedLeaderboard[1];
    const thirdPlace = sortedLeaderboard[2];

    return (
      <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
        {/* Header */}
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-surface-light)] px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[var(--color-primary)]">duello.lab</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              Dashboard'a Dön
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full p-6">
          {/* Trophy Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>🏆 Düello Sonuçlandı</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white">{room.title}</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{room.category} Kategorisi • 2 Yanlış 1 Doğruyu Götürür</p>
          </div>

          {/* 3D-STYLE PODIUM STAGE */}
          <div className="bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-light)]/40 rounded-3xl p-8 mb-8 border border-[var(--color-surface-light)] shadow-2xl">
            <div className="flex items-end justify-center gap-3 sm:gap-6 pt-10 pb-4">
              {/* 2nd Place (Silver - Left) */}
              {secondPlace && (
                <div className="flex-1 flex flex-col items-center max-w-[170px]">
                  <div className="text-3xl mb-1 drop-shadow">🥈</div>
                  <div className="text-xs font-bold text-white truncate max-w-full mb-1">
                    {secondPlace.username}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 font-bold mb-2">
                    {secondPlace.netScore.toFixed(1)} Net
                  </div>
                  {/* Pedestal */}
                  <div className="w-full bg-gradient-to-b from-slate-400/30 to-slate-600/40 border-t-4 border-slate-300 rounded-t-2xl h-36 flex flex-col items-center justify-center shadow-lg">
                    <span className="text-3xl font-black text-slate-300">2</span>
                    <span className="text-[10px] text-slate-300 font-semibold mt-1">
                      +50 XP • +20 💰
                    </span>
                  </div>
                </div>
              )}

              {/* 1st Place (Gold - Center / Highest) */}
              {firstPlace && (
                <div className="flex-1 flex flex-col items-center max-w-[200px]">
                  <div className="text-5xl mb-1 animate-bounce drop-shadow">👑</div>
                  <div className="text-sm font-extrabold text-amber-300 truncate max-w-full mb-1">
                    {firstPlace.username}
                  </div>
                  <div className="text-xs font-mono text-emerald-400 font-extrabold mb-2">
                    {firstPlace.netScore.toFixed(1)} Net • {(firstPlace.durationMs / 1000).toFixed(1)}s
                  </div>
                  {/* Pedestal */}
                  <div className="w-full bg-gradient-to-b from-amber-500/30 to-amber-700/40 border-t-4 border-amber-400 rounded-t-2xl h-48 flex flex-col items-center justify-center shadow-xl relative overflow-hidden">
                    <div className="text-4xl font-black text-amber-300">1</div>
                    <span className="text-xs text-amber-300 font-bold mt-1 uppercase tracking-wider">Şampiyon</span>
                    <span className="text-[11px] text-amber-200 font-bold mt-0.5">
                      +100 XP • +40 💰
                    </span>
                  </div>
                </div>
              )}

              {/* 3rd Place (Bronze - Right) */}
              {thirdPlace && (
                <div className="flex-1 flex flex-col items-center max-w-[170px]">
                  <div className="text-3xl mb-1 drop-shadow">🥉</div>
                  <div className="text-xs font-bold text-white truncate max-w-full mb-1">
                    {thirdPlace.username}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 font-bold mb-2">
                    {thirdPlace.netScore.toFixed(1)} Net
                  </div>
                  {/* Pedestal */}
                  <div className="w-full bg-gradient-to-b from-amber-900/30 to-amber-950/40 border-t-4 border-amber-700 rounded-t-2xl h-28 flex flex-col items-center justify-center shadow-lg">
                    <span className="text-3xl font-black text-amber-600">3</span>
                    <span className="text-[10px] text-amber-600 font-semibold mt-1">
                      +25 XP • +10 💰
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User's Reward Summary Card */}
          {myResult && (
            <div className="bg-[var(--color-surface)] border-2 border-[var(--color-primary)] rounded-2xl p-6 mb-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-[var(--color-primary)] font-bold uppercase tracking-wider">Senin Başarın</span>
                <h4 className="text-xl font-bold text-white">Sıralama: #{myResult.rank}</h4>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {myResult.correctCount} Doğru • {myResult.wrongCount} Yanlış • {myResult.blankCount} Boş • {(myResult.durationMs / 1000).toFixed(1)} sn
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 px-4 py-2 rounded-xl text-center">
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Kazanılan XP</span>
                  <span className="text-lg font-bold text-[var(--color-accent)]">+{myResult.xpGained} XP</span>
                </div>
                <div className="bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/30 px-4 py-2 rounded-xl text-center">
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Kazanılan Coin</span>
                  <span className="text-lg font-bold text-[var(--color-warning)]">+{myResult.coinsGained} 💰</span>
                </div>
              </div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <h3 className="text-xl font-bold text-white mb-4">🏅 Tüm Katılımcılar</h3>
          <div className="space-y-3 mb-8">
            {sortedLeaderboard.map((player, idx) => {
              const isMe = player.userId === user?.id;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

              return (
                <div
                  key={player.userId}
                  className={`bg-[var(--color-surface)] rounded-2xl p-5 border-2 flex items-center justify-between transition-all ${isMe
                    ? 'border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10'
                    : 'border-[var(--color-surface-light)]'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold font-mono w-10 text-center">{medal}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{player.username}</span>
                        {isMe && (
                          <span className="text-[10px] bg-[var(--color-primary)] text-white px-2 py-0.5 rounded-full font-bold">
                            SEN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {player.correctCount} Doğru • {player.wrongCount} Yanlış • {player.blankCount} Boş • {(player.durationMs / 1000).toFixed(1)} sn
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-[var(--color-success)]">
                      {player.netScore.toFixed(1)} <span className="text-xs font-normal text-[var(--color-text-muted)]">Net</span>
                    </div>
                    <div className="text-xs text-[var(--color-accent)] font-semibold mt-0.5">
                      +{player.xpGained} XP • +{player.coinsGained} 💰
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold py-4 rounded-xl shadow-lg transition cursor-pointer"
          >
            Dashboard'a Dön
          </button>
        </main>
      </div>
    );
  }

  // ==========================================
  // VIEW: LIVE MULTIPLAYER EXAM (MATCH)
  // ==========================================
  if (viewMode === 'match') {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 bg-[var(--color-surface-light)] border border-[var(--color-primary)] text-white px-5 py-3 rounded-xl shadow-2xl animate-bounce text-sm">
            {toastMessage}
          </div>
        )}

        {/* Top Header with Synchronized Server Timer & Countdown */}
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-surface-light)] px-6 py-3 sticky top-0 z-30 shadow-md">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[var(--color-primary)]">{room.title}</h1>
              <span className="text-xs text-[var(--color-text-muted)]">{room.category} • Soru {currentQuestionIndex + 1}/{totalQuestions}</span>
            </div>

            {/* Central Server-Synced Timer */}
            <div className="flex items-center gap-6">
              <div className="bg-[var(--color-surface-light)] px-4 py-2 rounded-xl border border-white/5 text-center">
                <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Kalan Süre</div>
                <div className={`text-2xl font-mono font-extrabold ${remainingSeconds < 30 ? 'text-[var(--color-danger)] animate-pulse' : 'text-[var(--color-accent)]'}`}>
                  {formatTimer(remainingSeconds)}
                </div>
              </div>
              <div className="text-center hidden sm:block">
                <div className="text-xs text-[var(--color-text-muted)]">Cevaplanan</div>
                <div className="text-lg font-bold text-white">{myAnsweredCount}/{totalQuestions}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full p-6">
          {/* LIVE OPPONENTS PROGRESS TRACKER */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 mb-6 border border-[var(--color-surface-light)] shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ⚔️ Canlı Rakip İlerlemesi
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">Anlık soket senkronizasyonu</span>
            </div>

            <div className="space-y-3">
              {room.users.map((player) => {
                const isMe = player.userId === user?.id;
                const prog = playerProgressMap[player.userId] || {
                  currentQuestionIndex: player.currentQuestionIndex || 0,
                  answeredCount: player.answeredCount || 0,
                  progressPercentage: player.progressPercentage || 0
                };
                const percentage = isMe
                  ? (totalQuestions > 0 ? Math.round((myAnsweredCount / totalQuestions) * 100) : 0)
                  : prog.progressPercentage;

                return (
                  <div key={player.userId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{player.username}</span>
                        {isMe && (
                          <span className="text-[10px] bg-[var(--color-primary)] text-white px-1.5 py-0.2 rounded font-bold">
                            SEN
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-[var(--color-accent)]">{percentage}%</span>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="w-full bg-[var(--color-surface-light)] rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ease-out ${isMe
                          ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Question View */}
          {currentQuestion ? (
            <div className="bg-[var(--color-surface)] rounded-3xl p-8 mb-6 border border-[var(--color-surface-light)] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold px-3 py-1 rounded-full">
                  Soru {currentQuestionIndex + 1} / {totalQuestions}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{currentQuestion.branch}</span>
              </div>

              {/* Question Text */}
              <p className="text-lg text-white font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                {currentQuestion.questionText}
              </p>

              {/* Question Image */}
              {currentQuestion.imageUrl && (
                <div className="mb-6">
                  <img src={currentQuestion.imageUrl} alt="Soru görseli" className="max-w-full rounded-xl border border-white/5" />
                </div>
              )}

              {/* Choices */}
              <div className="space-y-3">
                {Object.entries(currentQuestion.choices).map(([key, text]) => {
                  const isSelected = answers[currentQuestion.id] === key;

                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectChoice(currentQuestion.id, key)}
                      className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all flex items-center font-medium cursor-pointer ${isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 text-white shadow-lg shadow-[var(--color-primary)]/10'
                        : 'border-[var(--color-surface-light)] bg-[var(--color-surface-light)] hover:border-[var(--color-primary)]/40 text-[var(--color-text)]'
                        }`}
                    >
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl mr-4 text-sm font-bold transition ${isSelected
                        ? 'bg-[var(--color-primary)] text-white shadow'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
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
            <div className="bg-[var(--color-surface)] rounded-2xl p-12 text-center text-[var(--color-text-muted)]">
              Soru bulunamadı.
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => handleNavigateQuestion(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 bg-[var(--color-surface)] rounded-xl text-white disabled:opacity-30 hover:bg-[var(--color-surface-light)] transition font-semibold text-sm cursor-pointer"
            >
              ← Önceki
            </button>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <button
                onClick={handleSubmitMatch}
                disabled={submitting}
                className="px-8 py-3 bg-[var(--color-success)] hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Gönderiliyor...' : 'Sınavı Bitir ✓'}
              </button>
            ) : (
              <button
                onClick={() => handleNavigateQuestion(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-xl transition text-sm cursor-pointer"
              >
                Sonraki →
              </button>
            )}
          </div>

          {/* Question Navigator Dots */}
          <div className="flex flex-wrap gap-2 justify-center">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => handleNavigateQuestion(idx)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition cursor-pointer ${idx === currentQuestionIndex
                  ? 'bg-[var(--color-primary)] text-white shadow-lg'
                  : answers[q.id] !== null
                    ? 'bg-[var(--color-success)]/30 text-[var(--color-success)] border border-[var(--color-success)]/50'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-light)]'
                  }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // VIEW: LOBBY (DEFAULT)
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--color-surface-light)] border border-[var(--color-primary)] text-white px-5 py-3 rounded-xl shadow-2xl animate-bounce text-sm flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-surface-light)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1
              onClick={() => navigate('/dashboard')}
              className="text-2xl font-bold text-[var(--color-primary)] cursor-pointer hover:opacity-80 transition"
            >
              duello.lab
            </h1>
            <LiveStatusBadge />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[var(--color-text-muted)]">{user?.username}</span>
            <button
              onClick={handleLeaveRoom}
              className="text-sm text-[var(--color-danger)] hover:underline cursor-pointer"
            >
              Lobiden Ayrıl
            </button>
          </div>
        </div>
      </header>

      {/* Main Lobby View */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        {/* Top Info Banner */}
        <div className="bg-[var(--color-surface)] rounded-3xl p-8 mb-8 shadow-xl border border-[var(--color-surface-light)] relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {room.category}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {room.questionCount} Soru • Max {room.maxPlayers} Oyuncu
                </span>
              </div>
              <h2 className="text-3xl font-extrabold text-white">{room.title}</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Oda Sahibi: <span className="text-[var(--color-accent)] font-semibold">{room.hostUsername}</span>
              </p>
            </div>

            {/* Room Code Card */}
            <div className="bg-[var(--color-bg)]/80 border-2 border-[var(--color-primary)]/40 rounded-2xl p-4 text-center min-w-[240px]">
              <div className="text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider font-semibold">
                Oda Kodu
              </div>
              <div className="text-4xl font-mono font-black text-[var(--color-primary)] tracking-widest mb-3">
                {room.roomCode}
              </div>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={copyCode}
                  className="px-3 py-1.5 bg-[var(--color-surface-light)] hover:bg-[var(--color-surface)] text-xs font-medium rounded-lg text-white transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? '✓ Kopyalandı' : '📋 Kodu Kopyala'}
                </button>
                <button
                  onClick={copyInviteLink}
                  className="px-3 py-1.5 bg-[var(--color-surface-light)] hover:bg-[var(--color-surface)] text-xs font-medium rounded-lg text-white transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? '✓ Kopyalandı' : '🔗 Davet Linki'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Players Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">Katılımcılar</h3>
            <span className="bg-[var(--color-surface-light)] text-xs font-semibold px-2.5 py-1 rounded-full text-[var(--color-text-muted)]">
              {room.users.length} / {room.maxPlayers}
            </span>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            ⚡ Sayfa yenilemeye gerek yoktur, liste canlı güncellenir.
          </span>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {room.users.map((participant) => {
            const isUserHost = participant.userId === room.hostUserId || participant.isHost;
            const isMe = participant.userId === user?.id;

            return (
              <div
                key={participant.userId}
                className={`bg-[var(--color-surface)] rounded-2xl p-5 border-2 transition-all duration-300 flex items-center justify-between ${isMe
                  ? 'border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10'
                  : 'border-[var(--color-surface-light)]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-light)] flex items-center justify-center text-xl font-bold text-[var(--color-primary)] border border-white/5 relative">
                    {participant.username.charAt(0).toUpperCase()}
                    {isUserHost && (
                      <span className="absolute -top-2 -right-2 text-sm drop-shadow" title="Oda Sahibi">
                        👑
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{participant.username}</span>
                      {isMe && (
                        <span className="text-[10px] bg-[var(--color-primary)] text-white px-1.5 py-0.5 rounded font-bold">
                          SEN
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Seviye {participant.level || 1}
                    </div>
                  </div>
                </div>

                {/* Ready Status */}
                <div>
                  {isUserHost ? (
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                      👑 Host
                    </span>
                  ) : participant.isReady ? (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Hazır
                    </span>
                  ) : (
                    <span className="bg-white/5 text-[var(--color-text-muted)] border border-white/10 text-xs font-semibold px-2.5 py-1 rounded-full">
                      Bekliyor...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls Bar */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-surface-light)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-[var(--color-text-muted)] text-center sm:text-left">
            {isHost ? (
              <span>Hazır olan tüm oyuncularla savaşı başlatabilirsiniz.</span>
            ) : (
              <span>Oyuna başlamak için hazır durumunuzu güncelleyin.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isHost ? (
              <button
                onClick={handleStartMatch}
                className="w-full sm:w-auto px-8 py-3.5 bg-[var(--color-success)] hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚔️ Savaşı Başlat</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-mono">
                  {room.users.length} Oyuncu
                </span>
              </button>
            ) : (
              <button
                onClick={handleToggleReady}
                className={`w-full sm:w-auto px-8 py-3.5 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${isReady
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] shadow-[var(--color-primary)]/20'
                  }`}
              >
                {isReady ? '⚪ Hazır Değilim' : '🟢 Hazırım!'}
              </button>
            )}

            <button
              onClick={handleLeaveRoom}
              className="w-full sm:w-auto px-5 py-3.5 bg-[var(--color-surface-light)] hover:bg-[var(--color-danger)]/20 hover:text-[var(--color-danger)] text-[var(--color-text-muted)] font-semibold rounded-xl transition cursor-pointer"
            >
              Ayrıl
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
