import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/';

  const sanitizeError = (err, fallback = 'Login failed. Please check credentials.') => {
    if (!err) return fallback;
    if (typeof err === 'string' && err !== '[object Object]') return err;
    if (err.message && typeof err.message === 'string' && err.message !== '[object Object]') return err.message;
    if (typeof err.error === 'string' && err.error !== '[object Object]') return err.error;
    if (err.data?.error) {
      if (typeof err.data.error === 'string' && err.data.error !== '[object Object]') return err.data.error;
      if (typeof err.data.error.message === 'string') return err.data.error.message;
    }
    return fallback;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'donor') navigate('/donor/dashboard');
      else navigate('/requester/dashboard');
    } catch (err) {
      setError(sanitizeError(err, 'Login failed. Please check credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setLoading(true);
    setError(null);
    try {
      const user = await loginAsDemo(role);
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'donor') navigate('/donor/dashboard');
      else navigate('/requester/dashboard');
    } catch (err) {
      setError(sanitizeError(err, 'Demo login failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-8">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white mx-auto shadow-md shadow-rose-200">
          <Heart className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Log In to BloodBridge</h1>
        <p className="text-xs text-slate-500">Access emergency requests, donor settings, or administrative console</p>
      </div>

      {/* Demo Credentials Quick Switcher */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
          One-Click Demo Evaluator Access:
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleDemoLogin('admin')}
            disabled={loading}
            className="py-2 px-2 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors text-center border border-amber-300"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleDemoLogin('requester')}
            disabled={loading}
            className="py-2 px-2 text-[11px] font-bold text-rose-900 bg-rose-100 hover:bg-rose-200 rounded-xl transition-colors text-center border border-rose-300"
          >
            Requester
          </button>
          <button
            type="button"
            onClick={() => handleDemoLogin('donor')}
            disabled={loading}
            className="py-2 px-2 text-[11px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors text-center border border-emerald-300"
          >
            Donor
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">Password</label>
            <Link to="/forgot-password" className="text-[11px] font-semibold text-rose-600 hover:text-rose-700">
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center text-xs text-slate-500">
        Don't have an account?{' '}
        <Link to="/signup" className="font-bold text-rose-600 hover:text-rose-700 underline">
          Create Account
        </Link>
      </div>
    </div>
  );
}
