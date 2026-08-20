import api from './axios';
import { type UserDto } from './auth';
import { type SoloQuestion } from './exams';

export interface RoomUserInfo {
  userId: string;
  username: string;
  level: number;
  connectionId: string;
  joinedAt: string;
  isHost: boolean;
  isReady: boolean;
  score: number;

  // Gameplay & Progress
  currentQuestionIndex?: number;
  answeredCount?: number;
  progressPercentage?: number;
  isFinished?: boolean;
  finishedAt?: string;
  durationMs?: number;
  netScore?: number;
  correctCount?: number;
  wrongCount?: number;
  blankCount?: number;
  xpGained?: number;
  coinsGained?: number;
  rank?: number;
}

export type RoomStatus = 'Waiting' | 'Starting' | 'InProgress' | 'Finished' | 0 | 1 | 2 | 3;

export interface RoomState {
  roomCode: string;
  title: string;
  category: string;
  hostUserId: string;
  hostUsername: string;
  questionCount: number;
  status: RoomStatus;
  maxPlayers: number;
  newCoinBalance?: number;
  startTime?: string;
  durationSeconds?: number;
  questions?: SoloQuestion[];
  users: RoomUserInfo[];
  createdAt: string;
}

export interface CreateRoomPayload {
  title: string;
  category: string;
  questionCount?: number;
}

export interface MatchStartingData {
  roomCode: string;
  title: string;
  category: string;
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
}

export interface MatchPlayerResult {
  userId: string;
  username: string;
  level?: number;
  rank: number;
  netScore: number;
  durationMs: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  xpGained: number;
  coinsGained: number;
  isFinished: boolean;
}

export interface MatchEndedData {
  roomCode: string;
  title: string;
  category?: string;
  totalPlayers?: number;
  endedAt?: string;
  leaderboard: MatchPlayerResult[];
}

export const createRoom = (payload: CreateRoomPayload) =>
  api.post<RoomState>('/rooms/create', payload);

export const getRoom = (roomCode: string) =>
  api.get<RoomState>(`/rooms/${roomCode}`);

export const joinRoom = (roomCode: string) =>
  api.post<RoomState>('/rooms/join', { roomCode });

export const claimCoins = () =>
  api.post<UserDto>('/auth/claim-coins');
