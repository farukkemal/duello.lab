import api from './axios';
import { type SoloQuestion } from './exams';

export type GameMode = 0 | 1 | 2 | 3 | 4;
export const GameModeEnum = {
  CustomRoom: 0 as GameMode,
  Ranked1v1: 1 as GameMode,
  Battleground100: 2 as GameMode,
  SuddenDeath: 3 as GameMode,
  Squad2v2: 4 as GameMode,
};

export interface CreateRoomRequest {
  title: string;
  category: string;
  questionCount?: number;
  mode?: GameMode;
}

export interface RoomUserInfo {
  userId: string;
  username: string;
  level: number;
  connectionId?: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  team?: 'Red' | 'Blue';
  isEliminated?: boolean;
  eliminatedAtQuestion?: number;
  eliminationReason?: string;
  currentQuestionIndex?: number;
  answeredCount?: number;
  progressPercentage?: number;
  isFinished?: boolean;
  netScore?: number;
  durationMs?: number;
  xpGained?: number;
  coinsGained?: number;
  rank?: number;
  isBot?: boolean;
  botDifficulty?: string;
}


export interface RoomState {
  roomCode: string;
  title: string;
  category: string;
  mode: GameMode;
  hostUserId: string;
  hostUsername: string;
  questionCount: number;
  status: 'Waiting' | 'Starting' | 'InProgress' | 'Finished' | number;
  maxPlayers: number;
  startTime?: string;
  durationSeconds?: number;
  users: RoomUserInfo[];
  questions?: SoloQuestion[];
  currentZoneRound?: number;
  safeZonePlayersRemaining?: number;
  totalEliminatedCount?: number;
}

export interface MatchStartingData {
  roomCode: string;
  title: string;
  category: string;
  mode: GameMode;
  countdownSeconds: number;
  startTime: string;
  durationSeconds: number;
  totalQuestions: number;
  questions: SoloQuestion[];
}

export interface PlayerProgressData {
  userId: string;
  username: string;
  currentQuestionIndex: number;
  answeredCount: number;
  progressPercentage: number;
  isEliminated?: boolean;
  team?: 'Red' | 'Blue';
}

export interface MatchPlayerResult {
  userId: string;
  username: string;
  level: number;
  rank: number;
  netScore: number;
  durationMs: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  xpGained: number;
  coinsGained: number;
  isFinished: boolean;
  isEliminated?: boolean;
  team?: 'Red' | 'Blue';
}

export interface MatchEndedData {
  roomCode: string;
  title: string;
  category: string;
  mode: GameMode;
  totalPlayers: number;
  endedAt: string;
  leaderboard: MatchPlayerResult[];
  winner?: MatchPlayerResult;
  winningTeam?: string;
}

export interface MatchFoundData {
  roomCode: string;
  mode: GameMode;
  category: string;
  opponentUsername: string;
  opponentLevel: number;
}

export interface QueueStatusData {
  mode: GameMode;
  inQueueCount: number;
  elapsedSeconds: number;
}

export interface ZoneShrunkData {
  currentZoneRound: number;
  playersRemaining: number;
  eliminatedUserIds: string[];
  eliminatedUsernames: string[];
  message: string;
}

export interface PlayerEliminatedData {
  userId: string;
  username: string;
  questionIndex: number;
  reason: string;
}

export const createRoom = (data: CreateRoomRequest) =>
  api.post<RoomState>('/rooms/create', data);

export const createBattleground = (data: CreateRoomRequest) =>
  api.post<RoomState>('/rooms/battleground', data);

export const getRoom = (roomCode: string) =>
  api.get<RoomState>(`/rooms/${roomCode}`);

export const joinRoom = (roomCode: string) =>
  api.post<RoomState>('/rooms/join', { roomCode });

export const claimCoins = () =>
  api.post('/auth/claim-coins');

export interface CreateBotRoomRequest {
  category: string;
  questionCount: number;
  botDifficulties: string[]; // ["berkay", "emre", "nur"] gibi — 1-4 arası
}

export const createBotRoom = (data: CreateBotRoomRequest) =>
  api.post<RoomState>('/rooms/bot-room', data);

