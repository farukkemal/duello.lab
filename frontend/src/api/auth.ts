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
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export const register = (username: string, email: string, password: string) =>
  api.post<AuthResponse>('/auth/register', { username, email, password });

export const login = (username: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { username, password });

export const getMe = () =>
  api.get<UserDto>('/auth/me');
