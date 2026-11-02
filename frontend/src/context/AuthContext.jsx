import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Synchronously initialize session from localStorage to eliminate any render flash
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem('bloodbridge_token');
      const savedUser = localStorage.getItem('bloodbridge_user');
      if (token && savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      // Non-blocking fallback
    }
    return null;
  });

  // Loading is only true if a token exists and needs verification
  const [loading, setLoading] = useState(() => {
    return !!localStorage.getItem('bloodbridge_token') && !localStorage.getItem('bloodbridge_user');
  });

  // Save/clear user in localStorage helper
  const updateStoredUser = (userData) => {
    setUser(userData);
    if (userData) {
      try {
        localStorage.setItem('bloodbridge_user', JSON.stringify(userData));
      } catch (e) {}
    } else {
      localStorage.removeItem('bloodbridge_user');
    }
  };

  // Load / verify user session on mount
  useEffect(() => {
    async function loadSession() {
      const token = localStorage.getItem('bloodbridge_token');
      if (token) {
        try {
          const res = await api.auth.getMe();
          if (res.success && res.user) {
            updateStoredUser(res.user);
          } else {
            localStorage.removeItem('bloodbridge_token');
            updateStoredUser(null);
          }
        } catch (err) {
          console.warn('Session verification notice:', err.message);
          localStorage.removeItem('bloodbridge_token');
          updateStoredUser(null);
        }
      } else {
        updateStoredUser(null);
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

  const login = async (identifierOrEmail, password, role = null) => {
    const payload = {
      identifier: identifierOrEmail,
      email: identifierOrEmail,
      password,
      ...(role ? { role } : {})
    };
    const res = await api.auth.login(payload);
    if (res.success && res.token) {
      localStorage.setItem('bloodbridge_token', res.token);
      updateStoredUser(res.user);
      return res.user;
    }
    throw new Error(extractErrorMessage(res, 'Login failed. Please check credentials.'));
  };

  const signup = async (payload) => {
    const res = await api.auth.signup(payload);
    if (res.success && res.token) {
      localStorage.setItem('bloodbridge_token', res.token);
      updateStoredUser(res.user);
      return res.user;
    }
    throw new Error(extractErrorMessage(res, 'Registration failed. Please check your details.'));
  };

  const sendOtp = async (phone) => {
    return await api.auth.sendOtp({ phone });
  };

  const verifyOtp = async (phone, otp, challengeId) => {
    return await api.auth.verifyOtp({ phone, otp, challenge_id: challengeId });
  };

  const resendOtp = async (phone, challengeId) => {
    return await api.auth.resendOtp({ phone, challenge_id: challengeId });
  };

  const registerInitiate = async (payload) => {
    return await api.auth.registerInitiate(payload);
  };

  const verifyEmailOtp = async (email, otp, challengeId) => {
    const res = await api.auth.verifyEmailOtp({ email, otp, challenge_id: challengeId });
    if (res.success && res.token) {
      localStorage.setItem('bloodbridge_token', res.token);
      updateStoredUser(res.user);
      return res;
    }
    return res;
  };

  const resendEmailOtp = async (email, challengeId) => {
    return await api.auth.resendEmailOtp({ email, challenge_id: challengeId });
  };

  const setSessionUser = (userData, token) => {
    if (token) localStorage.setItem('bloodbridge_token', token);
    updateStoredUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('bloodbridge_token');
    updateStoredUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        updateStoredUser(res.user);
      }
    } catch (err) {
      console.warn('Could not refresh user:', err.message);
    }
  };

  const loginAsDemo = async (role) => {
    if (role === 'admin') {
      return login('admin@bloodbridge.org', 'AdminPass2026!');
    } else if (role === 'donor') {
      return login('donor.sarah@bloodbridge.org', 'DonorPass2026!');
    } else {
      return login('dr.mehta@cityhospital.org', 'HospitalPass2026!');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        sendOtp,
        verifyOtp,
        resendOtp,
        registerInitiate,
        verifyEmailOtp,
        resendEmailOtp,
        setSessionUser,
        logout,
        refreshUser,
        loginAsDemo,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isDonor: user?.role === 'donor',
        isRequester: user?.role === 'requester',
        isPatient: user?.role === 'requester'
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
