import { LoginResponse, User } from '@ratedeck/contracts';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  permissions: string[];
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (data: LoginResponse) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    permissions: [],
    token: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Phase 1: Simple localStorage token persistence
    // In Phase 2/3 this should move to HttpOnly cookies or silent refresh
    const stored = localStorage.getItem('rd_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthState;
        if (parsed.token) {
          setState(parsed);
        }
      } catch (err) {
        console.error('Failed to parse stored auth state', err);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (data: LoginResponse) => {
    const newState: AuthState = {
      isAuthenticated: true,
      user: data.user,
      permissions: data.permissions,
      token: data.accessToken,
    };
    setState(newState);
    localStorage.setItem('rd_auth', JSON.stringify(newState));
  };

  const logout = () => {
    setState({
      isAuthenticated: false,
      user: null,
      permissions: [],
      token: null,
    });
    localStorage.removeItem('rd_auth');
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
