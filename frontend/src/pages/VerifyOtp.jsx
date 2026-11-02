import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Smartphone,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  AlertCircle,
  RotateCw,
  Sparkles
} from 'lucide-react';

export default function VerifyOtp() {
  const { verifyOtp, resendOtp, verifyEmailOtp, resendEmailOtp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email') || location.state?.email || user?.email || '';
  const phoneParam = searchParams.get('phone') || location.state?.phone || user?.phone || '';
  const roleParam = searchParams.get('role') || location.state?.role || user?.role || 'donor';
  const initialChallengeId = searchParams.get('challenge_id') || location.state?.challenge_id || '';

  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // 60-second resend cooldown timer
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRef = useRef(null);

  // Masked email format helper: p***a@example.com
  const getMaskedEmail = (em) => {
    if (location.state?.email_masked) return location.state.email_masked;
    if (!em || !em.includes('@')) return 'your email';
    const [name, domain] = em.split('@');
    const masked = name.length <= 2 ? `${name[0]}***` : `${name[0]}***${name[name.length - 1]}`;
    return `${masked}@${domain}`;
  };

  // Masked phone format helper: +91 ******3210
  const getMaskedPhone = (p) => {
    const digits = String(p).replace(/\D/g, '');
    const last4 = digits.slice(-4) || '0000';
    return `+91 ******${last4}`;
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    setError(null);

    // Auto-submit when 6 digits are typed
    if (val.length === 6) {
      performVerification(val);
    }
  };

  const performVerification = async (codeToVerify) => {
    const code = codeToVerify || otp;
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let res;
      if (emailParam) {
        res = await verifyEmailOtp(emailParam, code, challengeId);
      } else {
        res = await verifyOtp(phoneParam, code, challengeId);
      }

      if (res && (res.success || res.verified)) {
        setVerifiedSuccess(true);
        showToast(emailParam ? 'Email verified successfully! Welcome to BloodBridge.' : 'Identity verified successfully!');
      } else {
        setError(res?.error || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      setError(err.message || 'Incorrect verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    performVerification(otp);
  };

  const handleResend = async () => {
    if (!canResend) return;

    setLoading(true);
    setError(null);

    try {
      let res;
      if (emailParam) {
        res = await resendEmailOtp(emailParam, challengeId);
      } else {
        res = await resendOtp(phoneParam, challengeId);
      }

      if (res && res.success) {
        setCountdown(60);
        setCanResend(false);
        showToast(emailParam ? 'New 6-digit verification code sent to your email.' : 'New verification code dispatched via SMS.');
      } else {
        setError(res?.error || 'Could not resend verification code. Please wait a moment.');
      }
    } catch (err) {
      setError(err.message || 'Resend failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (roleParam === 'donor') {
      navigate('/donor/dashboard');
    } else {
      navigate('/requester/dashboard');
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

      {/* Main OTP Card Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-9 border border-slate-200/90 shadow-xl shadow-slate-200/40 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-[#D71935]">
              {emailParam ? 'EMAIL VERIFICATION (BREVO)' : 'SMS TWO-FACTOR VERIFICATION'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              Enter Verification Code
            </h1>
            <p className="text-xs text-slate-500">
              {emailParam
                ? 'Securing your BloodBridge registry account with real-time email verification.'
                : 'Protecting the healthcare donor registry with real-time SMS authentication.'}
            </p>
          </div>

          {/* Masked Recipient Display Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3 text-xs text-slate-700">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#D71935] flex items-center justify-center flex-shrink-0">
              {emailParam ? <Mail className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-slate-500">
                {emailParam ? 'Code sent via Brevo to:' : 'Code sent via SMS to:'}
              </span>{' '}
              <strong className="text-slate-900 font-mono text-sm tracking-wide">
                {emailParam ? getMaskedEmail(emailParam) : getMaskedPhone(phoneParam)}
              </strong>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Success State or Verification Form */}
          {verifiedSuccess ? (
            <div className="space-y-5 text-center py-2 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {emailParam ? 'Email Verified Successfully!' : 'Phone Verified Successfully'}
                </h3>
                <p className="text-xs text-slate-500">
                  Your BloodBridge account is activated and your healthcare credentials have been registered.
                </p>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                className="w-full py-3.5 px-4 text-xs font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-2xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Continue to {roleParam === 'donor' ? 'Donor Portal' : 'Requester Portal'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Six-digit OTP input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 text-center">
                  Six-digit Verification Code
                </label>
                <div className="flex justify-center">
                  <input
                    ref={inputRef}
                    type="text"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={handleOtpChange}
                    placeholder="••••••"
                    className="w-48 py-3 text-center font-mono font-black text-2xl tracking-[0.45em] bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-[#D71935]/20 focus:border-[#D71935] transition-all shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-center text-slate-400">
                  Check your inbox and spam folder. Code expires in 5 minutes.
                </p>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 px-4 text-xs font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-2xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                <span>{loading ? 'Verifying Code...' : 'Verify & Complete Registration'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Resend OTP Section */}
              <div className="text-center pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || loading}
                  className={`font-bold transition-colors flex items-center gap-1 ${
                    canResend
                      ? 'text-[#D71935] hover:underline cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {canResend ? 'Resend Code' : `Resend in ${countdown}s`}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Security Notice */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
            <Shield className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>BloodBridge will never ask for your verification code.</span>
          </div>
        </div>
      </main>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold py-3 px-4 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-400 border-t border-slate-200/80 bg-white">
        © 2026 BloodBridge Vision-X • Healthcare Emergency Coordination Network
      </footer>
    </div>
  );
}
