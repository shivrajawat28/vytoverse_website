import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@/types';
import { authAPI } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, username?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vytoverse_token');
    const savedUser = localStorage.getItem('vytoverse_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('vytoverse_token');
        localStorage.removeItem('vytoverse_user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      refreshUser();
    }
  }, []);

  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
      localStorage.setItem('vytoverse_user', JSON.stringify(res.data));
    } catch {
      // Token may be expired - keep cached user
    }
  };

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('vytoverse_token', access_token);
    localStorage.setItem('vytoverse_user', JSON.stringify(userData));
    setUser(userData);
  };

  const signup = async (name: string, email: string, password: string, username?: string) => {
    const res = await authAPI.signup({ name, email, password, username });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('vytoverse_token', access_token);
    localStorage.setItem('vytoverse_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('vytoverse_token');
    localStorage.removeItem('vytoverse_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        loading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
