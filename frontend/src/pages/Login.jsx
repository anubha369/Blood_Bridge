import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Shield,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export default function Login() {
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse query params (e.g. ?role=donor or ?role=patient or ?role=admin)
  const searchParams = new URLSearchParams(location.search);
  const initialRole = searchParams.get('role') || 'donor';

  const [activeRole, setActiveRole] = useState(initialRole);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const from = location.state?.from?.pathname || null;

  useEffect(() => {
    if (searchParams.get('role')) {
      setActiveRole(searchParams.get('role'));
    }
  }, [location.search]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

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

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    setError(null);
  };

  const handleQuickDemo = async (role) => {
    setActiveRole(role);
    setError(null);
    setLoading(true);
    try {
      let user;
      if (role === 'donor') {
        setIdentifier('donor.sarah@bloodbridge.org');
        setPassword('DonorPass2026!');
        user = await login('donor.sarah@bloodbridge.org', 'DonorPass2026!', 'donor');
      } else if (role === 'patient') {
        setIdentifier('dr.mehta@cityhospital.org');
        setPassword('HospitalPass2026!');
        user = await login('dr.mehta@cityhospital.org', 'HospitalPass2026!', 'requester');
      } else {
        setIdentifier('admin@bloodbridge.org');
        setPassword('AdminPass2026!');
        user = await login('admin@bloodbridge.org', 'AdminPass2026!', 'admin');
      }

      showToast(`Signed in successfully as ${user.name}`);
      redirectUser(user);
    } catch (err) {
      setError(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  };

  const redirectUser = (user) => {
    if (from && from !== '/' && from !== '/login') {
      navigate(from, { replace: true });
    } else if (user.role === 'admin') {
      navigate('/admin/dashboard');
    } else if (user.role === 'donor') {
      navigate('/donor/dashboard');
    } else {
      navigate('/requester/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;

    setLoading(true);
    setError(null);

    try {
      const user = await login(identifier, password, activeRole === 'patient' ? 'requester' : activeRole);
      redirectUser(user);
    } catch (err) {
      setError(sanitizeError(err, 'Invalid email, mobile number, username, or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-[#D71935] selection:text-white">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="BloodBridge Home">
            <svg
              className="w-7 h-8 transition-transform group-hover:scale-105"
              viewBox="0 0 24 28"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 2.5 C 12 2.5, 5 11, 5 17 A 7 7 0 0 0 19 17 C 19 11, 12 2.5, 12 2.5 Z"
                stroke="#D71935"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-[#D71935]">Blood</span>
              <span className="text-[#0F172A]">Bridge</span>
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#D71935] px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 bg-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-9 border border-slate-200/90 shadow-xl shadow-slate-200/40 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-[#D71935]">
              SECURE HEALTHCARE PORTAL
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              Welcome Back
            </h1>
            <p className="text-xs text-slate-500">
              Select your access role and enter your credentials.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl" role="tablist">
            <button
              type="button"
              onClick={() => handleRoleSelect('donor')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                activeRole === 'donor'
                  ? 'bg-white text-[#D71935] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              role="tab"
              aria-selected={activeRole === 'donor'}
            >
              Donor Portal
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('patient')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                activeRole === 'patient'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              role="tab"
              aria-selected={activeRole === 'patient'}
            >
              Patient / Hospital
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('admin')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                activeRole === 'admin'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              role="tab"
              aria-selected={activeRole === 'admin'}
            >
              Administrator
            </button>
          </div>

          {/* Quick Demo Evaluation Access */}
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D71935]" />
                1-Click Demonstration Login:
              </span>
              <span className="text-[10px] text-slate-400">Pre-seeded</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('donor')}
                className="py-1.5 px-2 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-[#D71935] hover:text-[#D71935] rounded-xl transition-all text-center truncate"
                title="Log in as Sarah (O- Donor)"
              >
                Sarah (Donor)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('patient')}
                className="py-1.5 px-2 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-[#0F172A] hover:text-[#0F172A] rounded-xl transition-all text-center truncate"
                title="Log in as Dr. Mehta (City Trauma ICU)"
              >
                Dr. Mehta (Hospital)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="py-1.5 px-2 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-[#0F172A] hover:text-[#0F172A] rounded-xl transition-all text-center truncate"
                title="Log in as Operations Admin"
              >
                Central Admin
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Email Address, Mobile (+91), or Username
              </label>
              <div className="relative">
                <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. donor.sarah@bloodbridge.org or +91 98765 43210"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#D71935]/20 focus:border-[#D71935] transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-bold text-[#D71935] hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#D71935]/20 focus:border-[#D71935] transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-10 h-10 absolute right-0 top-0 flex items-center justify-center text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-[#D71935] rounded border-slate-300 focus:ring-[#D71935]"
              />
              <label htmlFor="rememberMe" className="text-xs text-slate-600 cursor-pointer">
                Keep me securely authenticated on this workstation
              </label>
            </div>

            {/* Button Action Stack */}
            <div className="space-y-2.5 pt-2">
              {/* Sign In Button (Primary) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 text-xs font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-2xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Sign Up Button (Secondary) */}
              <Link
                to={`/signup${activeRole ? `?role=${activeRole}` : ''}`}
                className="w-full py-3 px-4 text-xs font-bold text-[#0F172A] bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl transition-all flex items-center justify-center gap-2 group"
              >
                <span>Sign Up</span>
                <ArrowRight className="w-4 h-4 text-[#0F172A] transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Auth Switch Link */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Haven't registered yet?{' '}
                <Link
                  to={`/signup${activeRole ? `?role=${activeRole}` : ''}`}
                  className="font-bold text-[#D71935] hover:underline"
                >
                  Click here to sign up
                </Link>
              </p>
            </div>
          </form>

          {/* Security Notice */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
            <Shield className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Protected by 256-Bit SSL &amp; Healthcare Registry Standards</span>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
