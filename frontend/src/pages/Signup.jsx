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
  Heart,
  Activity
} from 'lucide-react';

export default function Signup() {
  const { signup, sendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialRole = searchParams.get('role') || 'donor';

  const [role, setRole] = useState(initialRole === 'patient' ? 'requester' : initialRole);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone10, setPhone10] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (searchParams.get('role')) {
      const r = searchParams.get('role');
      setRole(r === 'patient' ? 'requester' : r);
    }
  }, [location.search]);

  const sanitizeError = (err, fallback = 'Registration failed. Please check your details.') => {
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

  const handlePhoneChange = (e) => {
    // Only accept numeric characters up to 10 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone10(cleaned);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !phone10) return;

    if (phone10.length !== 10 || !/^[6-9]/.test(phone10)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError(null);

    const fullPhone = `+91 ${phone10.slice(0, 5)} ${phone10.slice(5)}`;

    try {
      // 1. Register User in backend database
      const user = await signup({
        name,
        username: username || email.split('@')[0],
        email,
        password,
        role: role === 'patient' ? 'requester' : role,
        phone: fullPhone
      });

      // 2. Dispatch OTP challenge
      let challengeId = null;
      try {
        const otpRes = await sendOtp(fullPhone);
        if (otpRes.success) {
          challengeId = otpRes.challenge_id;
        }
      } catch (otpErr) {
        console.warn('Notice: OTP challenge initialized:', otpErr.message);
      }

      // 3. Navigate to OTP Verification page with context
      navigate(
        `/verify-otp?phone=${encodeURIComponent(fullPhone)}&role=${user.role}&challenge_id=${challengeId || ''}`,
        {
          state: {
            user,
            phone: fullPhone,
            role: user.role,
            challenge_id: challengeId
          }
        }
      );
    } catch (err) {
      setError(sanitizeError(err, 'Registration failed. Please check your details.'));
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

      {/* Main Signup Card Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-9 border border-slate-200/90 shadow-xl shadow-slate-200/40 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-[#D71935]">
              HEALTHCARE REGISTRY ENROLLMENT
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              Create an Account
            </h1>
            <p className="text-xs text-slate-500">
              Join our emergency response network to donate or coordinate blood supplies.
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">I want to register as:</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole('donor')}
                className={`py-3 px-3 text-xs font-bold rounded-2xl border transition-all flex items-center justify-center gap-2 ${
                  role === 'donor'
                    ? 'bg-rose-50 border-[#D71935] text-[#D71935] shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Heart className={`w-4 h-4 ${role === 'donor' ? 'fill-[#D71935]' : ''}`} />
                <span>Potential Blood Donor</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('requester')}
                className={`py-3 px-3 text-xs font-bold rounded-2xl border transition-all flex items-center justify-center gap-2 ${
                  role === 'requester'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Patient / Requester</span>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Full Name</label>
                <div className="relative">
                  <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#D71935]/20 focus:border-[#D71935] transition-all"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Username</label>
                <div className="relative">
                  <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center text-slate-400 text-xs font-bold">
                    @
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. priya_sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#D71935]/20 focus:border-[#D71935] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Number with +91 Country Badge */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Indian Mobile Number (for 2FA SMS Verification)
              </label>
              <div className="relative flex items-center">
                <div className="h-10 pl-3 pr-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl flex items-center gap-1.5 text-xs font-bold text-slate-700 select-none">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  required
                  value={phone10}
                  onChange={handlePhoneChange}
                  placeholder="98765 43210"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-r-xl focus:ring-2 focus:ring-[#D71935]/20 focus:border-[#D71935] transition-all font-mono tracking-wider"
                  maxLength={10}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                A 6-digit verification code will be sent to this Indian mobile number.
              </p>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#D71935]/20 focus:border-[#D71935] transition-all"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#D71935]/20 focus:border-[#D71935] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="w-9 h-10 absolute right-0 top-0 flex items-center justify-center text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Confirm Password</label>
                <div className="relative">
                  <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#D71935]/20 focus:border-[#D71935] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="w-9 h-10 absolute right-0 top-0 flex items-center justify-center text-slate-400 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 text-xs font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-2xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                <span>{loading ? 'Creating Account & Sending OTP...' : 'Complete Registration & Send OTP'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Auth Switch Link */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Already registered?{' '}
                <Link
                  to={`/login${role ? `?role=${role}` : ''}`}
                  className="font-bold text-[#D71935] hover:underline"
                >
                  Click here to sign in
                </Link>
              </p>
            </div>
          </form>

          {/* Security Notice */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
            <Shield className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Strict Privacy Protection • Zero Coordinate Leakage • TRAI 2FA Compliant</span>
          </div>
        </div>
      </main>
    </div>
  );
}
