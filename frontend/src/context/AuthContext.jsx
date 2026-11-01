import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user session on mount
  useEffect(() => {
    async function loadSession() {
      const token = localStorage.getItem('bloodbridge_token');
      if (token) {
        try {
          const res = await api.auth.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('bloodbridge_token');
          }
        } catch (err) {
          console.warn('Session verification notice:', err.message);
          localStorage.removeItem('bloodbridge_token');
        }
      }
      setLoading(false);
    }
    loadSession();
  }, []);

  const extractErrorMessage = (res, fallback) => {
    if (!res) return fallback;
    if (typeof res === 'string' && res !== '[object Object]') return res;
    if (typeof res.error === 'string' && res.error !== '[object Object]') return res.error;
    if (res.error?.message && typeof res.error.message === 'string') return res.error.message;
    if (typeof res.message === 'string' && res.message !== '[object Object]') return res.message;
    return fallback;
  };

  const login = async (email, password) => {
    const res = await api.auth.login({ email, password });
    if (res.success && res.token) {
      localStorage.setItem('bloodbridge_token', res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(extractErrorMessage(res, 'Login failed. Please check credentials.'));
  };

  const signup = async (payload) => {
    const res = await api.auth.signup(payload);
    if (res.success && res.token) {
      localStorage.setItem('bloodbridge_token', res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(extractErrorMessage(res, 'Registration failed. Please check your details.'));
  };

  const logout = () => {
    localStorage.removeItem('bloodbridge_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.warn('Could not refresh user:', err.message);
    }
  };

  const loginAsDemo = async (role) => {
    let email = '';
    if (role === 'admin') email = 'admin@bloodbridge.org';
    else if (role === 'donor') email = 'donor@bloodbridge.org';
    else email = 'requester@bloodbridge.org';

    return login(email, 'BloodBridge2026!');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        refreshUser,
        loginAsDemo,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isDonor: user?.role === 'donor',
        isRequester: user?.role === 'requester'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
