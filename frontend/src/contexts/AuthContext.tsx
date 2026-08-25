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
    const saved = localStorage.getItem('user');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      id: parsed.id || parsed.Id || '',
      username: parsed.username || parsed.Username || 'Savaşçı',
      email: parsed.email || parsed.Email || '',
      level: parsed.level || parsed.Level || 1,
      xp: parsed.xp || parsed.XP || 0,
      coinBalance: parsed.coinBalance ?? parsed.CoinBalance ?? 100,
      createdAt: parsed.createdAt || parsed.CreatedAt || '',
      role: parsed.role || parsed.Role || 'User',
      isBanned: parsed.isBanned ?? parsed.IsBanned ?? false
    };
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(parseStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = (newToken: string, newUser: UserDto) => {
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
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
    } catch (err: any) {
      if (err?.response?.status === 401) {
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
