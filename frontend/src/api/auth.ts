import api from './axios';

export interface UserDto {
  id: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  coinBalance: number;
  createdAt: string;
  role: string;       // "User" | "Admin"
  isBanned: boolean;
  avatar: string;
  title: string;
  bio: string;
  clanName?: string;
  clanTag?: string;
  jokerEliminateThree: number;
  jokerDoubleChance: number;
  jokerExtraTime: number;
}

export interface BranchPerformanceDto {
  branch: string;
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
  masteryLevel: string;
  statusColor: string;
  recommendation: string;
}

export interface PublicProfileDto {
  id: string;
  username: string;
  avatar: string;
  title: string;
  bio: string;
  level: number;
  xp: number;
  createdAt: string;
  clanId?: string;
  clanName?: string;
  clanTag?: string;
  clanRole?: string;
  clanBadge?: string;
  totalExamsTaken: number;
  totalQuestionsSolved: number;
  overallAccuracyRate: number;
  averageNetScore: number;
  strongestBranch: string;
  weakestBranch: string;
  branchHeatmap: BranchPerformanceDto[];
}

export interface UpdateProfileRequest {
  avatar?: string;
  title?: string;
  bio?: string;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export const register = (username: string, email: string, password: string) =>
  api.post<AuthResponse>('/auth/register', { username, email, password });

export const login = (username: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { username, password });

export const googleAuth = (idToken: string) =>
  api.post<AuthResponse>('/auth/google', { idToken });

export const getMe = () =>
  api.get<UserDto>('/auth/me');

export const updateProfile = (data: UpdateProfileRequest) =>
  api.put<UserDto>('/auth/profile', data);

export const getPublicProfile = (identifier: string) =>
  api.get<PublicProfileDto>(`/auth/profile/${identifier}`);
