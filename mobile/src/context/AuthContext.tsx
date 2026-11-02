import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { storage } from '../utils/storage';
import { User, UserRole } from '../constants/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifierOrEmail: string, password?: string, role?: UserRole) => Promise<User>;
  signup: (payload: any) => Promise<User>;
  sendOtp: (phone: string) => Promise<any>;
  verifyOtp: (phone: string, otp: string, challengeId: string) => Promise<any>;
  resendOtp: (phone: string, challengeId: string) => Promise<any>;
  registerInitiate: (payload: any) => Promise<any>;
  verifyEmailOtp: (email: string, otp: string, challengeId: string) => Promise<any>;
  resendEmailOtp: (email: string, challengeId: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loginAsDemo: (role: 'donor' | 'requester' | 'admin') => Promise<User>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDonor: boolean;
  isRequester: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load session from SecureStore on startup
  useEffect(() => {
    async function loadSession() {
      try {
        const token = await storage.getToken();
        const storedUser = await storage.getUser();

        if (token && storedUser) {
          setUser(storedUser);
        }

        if (token) {
          // Verify with backend
          try {
            const res = await api.auth.getMe();
            if (res.success && res.user) {
              setUser(res.user);
              await storage.setUser(res.user);
            } else {
              await storage.clearAll();
              setUser(null);
            }
          } catch (err: any) {
            console.warn('Session verification notice:', err.message);
            // If offline, keep local user if available, else clear
            if (err?.status === 401) {
              await storage.clearAll();
              setUser(null);
            }
          }
        }
      } catch (e) {
        console.warn('Error reading stored session:', e);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, []);

  const login = async (identifierOrEmail: string, password = '', role?: UserRole): Promise<User> => {
    const payload = {
      identifier: identifierOrEmail,
      email: identifierOrEmail,
      password,
      ...(role ? { role } : {})
    };

    const res = await api.auth.login(payload);
    if (res.success && res.token && res.user) {
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      setUser(res.user);
      return res.user;
    }

    const msg = (typeof res.error === 'string' ? res.error : res.message) || 'Login failed.';
    throw new Error(msg);
  };

  const signup = async (payload: any): Promise<User> => {
    const res = await api.auth.signup(payload);
    if (res.success && res.token && res.user) {
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      setUser(res.user);
      return res.user;
    }
    const msg = (typeof res.error === 'string' ? res.error : res.message) || 'Registration failed.';
    throw new Error(msg);
  };

  const sendOtp = async (phone: string) => {
    return await api.auth.sendOtp({ phone });
  };

  const verifyOtp = async (phone: string, otp: string, challengeId: string) => {
    const res = await api.auth.verifyOtp({ phone, otp, challenge_id: challengeId });
    if (res.success && res.token && res.user) {
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      setUser(res.user);
    }
    return res;
  };

  const resendOtp = async (phone: string, challengeId: string) => {
    return await api.auth.resendOtp({ phone, challenge_id: challengeId });
  };

  const registerInitiate = async (payload: any) => {
    return await api.auth.registerInitiate(payload);
  };

  const verifyEmailOtp = async (email: string, otp: string, challengeId: string) => {
    const res = await api.auth.verifyEmailOtp({ email, otp, challenge_id: challengeId });
    if (res.success && res.token && res.user) {
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      setUser(res.user);
    }
    return res;
  };

  const resendEmailOtp = async (email: string, challengeId: string) => {
    return await api.auth.resendEmailOtp({ email, challenge_id: challengeId });
  };

  const logout = async () => {
    await storage.clearAll();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        await storage.setUser(res.user);
      }
    } catch (e: any) {
      console.warn('Could not refresh user profile:', e.message);
    }
  };

  const loginAsDemo = async (role: 'donor' | 'requester' | 'admin'): Promise<User> => {
    if (role === 'admin') {
      return await login('admin@bloodbridge.org', 'AdminPass2026!');
    } else if (role === 'donor') {
      return await login('donor.sarah@bloodbridge.org', 'DonorPass2026!');
    } else {
      return await login('dr.mehta@cityhospital.org', 'HospitalPass2026!');
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

