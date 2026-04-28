import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kvm_token'));

  const login = useCallback((newToken: string) => {
    localStorage.setItem('kvm_token', newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('kvm_token');
    setToken(null);
  }, []);

  // Keep state in sync if another tab logs out
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'kvm_token') {
        setToken(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
