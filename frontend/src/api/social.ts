import api from './axios';

export interface ClanMember {
  userId: string;
  username: string;
  level: number;
  xpContributed: number;
  role: 0 | 1 | 2; // 0: Member, 1: Elder, 2: Leader
  joinedAt: string;
}

export interface Clan {
  id: string;
  name: string;
  description: string;
  tag: string;
  badgeIcon: string;
  minLevel: number;
  isOpen: boolean;
  leaderUserId: string;
  leaderUsername: string;
  totalXp: number;
  memberCount: number;
  rank: number;
  createdAt: string;
  members: ClanMember[];
}

export interface ClanListItem {
  id: string;
  name: string;
  description: string;
  tag: string;
  badgeIcon: string;
  minLevel: number;
  isOpen: boolean;
  totalXp: number;
  memberCount: number;
  rank: number;
}

export interface CreateClanRequest {
  name: string;
  description: string;
  tag: string;
  badgeIcon: string;
  minLevel: number;
  isOpen: boolean;
}

export interface Friend {
  friendshipId: string;
  userId: string;
  username: string;
  level: number;
  xp: number;
  isOnline: boolean;
  currentRoomCode?: string;
  friendsSince: string;
}

export interface PendingFriendRequest {
  friendshipId: string;
  requesterId: string;
  requesterUsername: string;
  requesterLevel: number;
  sentAt: string;
}

// Clan APIs
export const getMyClan = () => api.get<Clan | null>('/clan/my-clan');
export const getClan = (clanId: string) => api.get<Clan>(`/clan/${clanId}`);
export const getTopClans = (limit = 20) => api.get<ClanListItem[]>(`/clan/top?limit=${limit}`);
export const searchClans = (query: string) => api.get<ClanListItem[]>(`/clan/search?q=${encodeURIComponent(query)}`);
export const createClan = (data: CreateClanRequest) => api.post<Clan>('/clan/create', data);
export const joinClan = (clanId: string) => api.post<Clan>(`/clan/${clanId}/join`);
export const leaveClan = (clanId: string) => api.post(`/clan/${clanId}/leave`);

// Friend APIs
export const getFriendsList = () => api.get<Friend[]>('/friend/list');
export const getPendingFriendRequests = () => api.get<PendingFriendRequest[]>('/friend/pending');
export const sendFriendRequest = (targetUsername: string) => api.post<PendingFriendRequest>('/friend/request', { targetUsername });
export const respondFriendRequest = (friendshipId: string, accept: boolean) => api.post('/friend/respond', { friendshipId, accept });
export const removeFriend = (friendshipId: string) => api.delete(`/friend/${friendshipId}`);
