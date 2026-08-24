import api from './axios';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalQuestions: number;
  totalExams: number;
  activeRooms: number;
  totalCoinsInCirculation: number;
  bannedUsers: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  coinBalance: number;
  role: string;
  isBanned: boolean;
  createdAt: string;
}

export interface AdminQuestion {
  id: string;
  examId: string;
  examTitle: string;
  branch: string;
  questionText: string;
  choices: Record<string, string>;
  correctAnswer: string;
  solutionText?: string;
  imageUrl?: string;
  poolType: string;
}

export interface AdminRoom {
  code: string;
  examTitle: string;
  playerCount: number;
  status: string;
  players: string[];
}

export interface AdminExamRef {
  id: string;
  title: string;
  questionCount: number;
}

// ─── Stats ───────────────────────────────────────────────────────────────────
export const getAdminStats = () => api.get<AdminStats>('/admin/stats');

// ─── Users ───────────────────────────────────────────────────────────────────
export const getAdminUsers = (params?: { search?: string; page?: number; pageSize?: number }) =>
  api.get<{ users: AdminUser[]; total: number; page: number; pageSize: number }>('/admin/users', { params });

export const getAdminUser = (id: string) => api.get<AdminUser>(`/admin/users/${id}`);

export const updateUserEconomy = (id: string, data: { deltaXP: number; deltaCoin: number; setLevel?: number }) =>
  api.put<AdminUser>(`/admin/users/${id}/economy`, data);

export const updateUserRole = (id: string, role: string) =>
  api.put(`/admin/users/${id}/role`, { role });

export const banUser = (id: string, isBanned: boolean) =>
  api.put(`/admin/users/${id}/ban`, { isBanned });

// ─── Questions ───────────────────────────────────────────────────────────────
export const getAdminQuestions = (params?: { search?: string; branch?: string; poolType?: string; page?: number; pageSize?: number }) =>
  api.get<{ questions: AdminQuestion[]; total: number; page: number; pageSize: number }>('/admin/questions', { params });

export const getAdminQuestion = (id: string) => api.get<AdminQuestion>(`/admin/questions/${id}`);

export const createAdminQuestion = (data: Omit<AdminQuestion, 'id' | 'examTitle'>) =>
  api.post<AdminQuestion>('/admin/questions', data);

export const updateAdminQuestion = (id: string, data: Partial<Omit<AdminQuestion, 'id' | 'examId' | 'examTitle'>>) =>
  api.put<AdminQuestion>(`/admin/questions/${id}`, data);

export const deleteAdminQuestion = (id: string) => api.delete(`/admin/questions/${id}`);

export const getAdminExams = () => api.get<AdminExamRef[]>('/admin/exams');

// ─── Rooms ───────────────────────────────────────────────────────────────────
export const getAdminRooms = () => api.get<AdminRoom[]>('/admin/rooms');

export const terminateRoom = (code: string) => api.delete(`/admin/rooms/${code}`);
