import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type UserDto, getMe } from '../api/auth';

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  setAuth: (token: string, user: UserDto) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const parseStoredUser = (): UserDto | null => {
  try {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');

    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }

    if (!saved || saved === 'undefined' || saved === 'null') {
      localStorage.removeItem('user');
      return null;
    }

    const parsed = JSON.parse(saved);
    const userId = parsed?.id || parsed?.Id;
    if (!parsed || typeof parsed !== 'object' || !userId) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }

    return {
      id: userId,
      username: parsed.username || parsed.Username || 'Savaşçı',
      email: parsed.email || parsed.Email || '',
      level: parsed.level || parsed.Level || 1,
      xp: parsed.xp || parsed.XP || 0,
      coinBalance: parsed.coinBalance ?? parsed.CoinBalance ?? 100,
      createdAt: parsed.createdAt || parsed.CreatedAt || '',
      role: parsed.role || parsed.Role || 'User',
      isBanned: parsed.isBanned ?? parsed.IsBanned ?? false,
      avatar: parsed.avatar || parsed.Avatar || 'default',
      title: parsed.title || parsed.Title || 'Savaşçı',
      bio: parsed.bio || parsed.Bio || '',
      clanName: parsed.clanName || parsed.ClanName,
      clanTag: parsed.clanTag || parsed.ClanTag,
      jokerEliminateThree: parsed.jokerEliminateThree ?? parsed.JokerEliminateThree ?? 1,
      jokerDoubleChance: parsed.jokerDoubleChance ?? parsed.JokerDoubleChance ?? 1,
      jokerExtraTime: parsed.jokerExtraTime ?? parsed.JokerExtraTime ?? 1
    };
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(parseStoredUser);
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem('token');
    return t && t !== 'undefined' && t !== 'null' && t.trim() !== '' ? t : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = (newToken: string, newUser: UserDto) => {
    if (!newToken || !newUser || !newUser.id) {
      console.error('Invalid setAuth call. Missing token or user ID:', { newToken, newUser });
      return;
    }
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      const { data } = await getMe();
      if (!data || !data.id) {
        logout();
        return;
      }
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, setAuth, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
