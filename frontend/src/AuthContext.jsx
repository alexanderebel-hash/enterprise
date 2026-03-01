import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('lcars_token'));
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('lcars_token', res.token);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lcars_token');
  }, []);

  const checkAuth = useCallback(async () => {
    if (!token) return null;
    try {
      const u = await api.getMe(token);
      setUser(u);
      return u;
    } catch {
      logout();
      return null;
    }
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
