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

  const login = async (email, password) => {
    const res = await api.auth.login({ email, password });
    if (res.success && res.token) {
      localStorage.setItem('bloodbridge_token', res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.error || 'Login failed');
  };

  const signup = async (payload) => {
    const res = await api.auth.signup(payload);
    if (res.success && res.token) {
      localStorage.setItem('bloodbridge_token', res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.error || 'Signup failed');
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
