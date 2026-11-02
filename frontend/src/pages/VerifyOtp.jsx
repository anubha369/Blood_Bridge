import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  AlertCircle,
  RotateCw,
  Clock
} from 'lucide-react';

export default function VerifyOtp() {
  const { verifyEmailOtp, resendEmailOtp, verifyOtp, resendOtp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email') || location.state?.email || user?.email || '';
  const phoneParam = searchParams.get('phone') || location.state?.phone || user?.phone || '';
  const roleParam = searchParams.get('role') || location.state?.role || user?.role || 'donor';
  const initialChallengeId = searchParams.get('challenge_id') || location.state?.challenge_id || '';

  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // 5-minute code expiration timer (300 seconds)
  const [expirySeconds, setExpirySeconds] = useState(300);

  // 60-second resend cooldown timer
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Array of 6 input refs
  const inputsRef = useRef([]);

  // Masked email format helper: e.g. a***a@gmail.com
  const getMaskedEmail = (em) => {
    if (location.state?.email_masked) return location.state.email_masked;
    if (!em || !em.includes('@')) return 'your email';
    const [name, domain] = em.split('@');
    const masked = name.length <= 2 ? `${name[0]}***` : `${name[0]}***${name[name.length - 1]}`;
    return `${masked}@${domain}`;
  };

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  // 5-minute expiration countdown
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [expirySeconds]);

  // 60-second resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle single digit changes
  const handleDigitChange = (index, value) => {
    // Clean numeric only
    const cleanVal = value.replace(/\D/g, '');

    // Case 1: user pasted multi-digits into a box directly
    if (cleanVal.length > 1) {
      handlePastedCode(cleanVal);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);
    setError(null);

    // Auto-advance to next box if character entered
    if (cleanVal && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace and arrow navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is empty, move back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputsRef.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  // Handle clipboard paste of 6 digits
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    handlePastedCode(pasteData);
  };

  const handlePastedCode = (pasteString) => {
    const numericOnly = pasteString.replace(/\D/g, '').slice(0, 6);
    if (!numericOnly) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < numericOnly.length; i++) {
      newDigits[i] = numericOnly[i];
    }
    setDigits(newDigits);
    setError(null);

    // Focus appropriate box
    const focusIndex = Math.min(numericOnly.length, 5);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const code = digits.join('').trim();

    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (expirySeconds <= 0) {
      setError('Verification code has expired. Please click "Resend Code".');
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
        showToast('Email verified successfully! Welcome to BloodBridge.');
      } else {
        setError(res?.error || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Incorrect verification code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || loading) return;

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
        if (res.challenge_id) setChallengeId(res.challenge_id);
        setDigits(['', '', '', '', '', '']);
        setExpirySeconds(300);
        setCooldown(60);
        setCanResend(false);
        showToast('A new 6-digit verification code has been sent to your email.');
        inputsRef.current[0]?.focus();
      } else {
        setError(res?.error || 'Could not resend verification code. Please wait a moment.');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
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
            to="/signup"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#D71935] px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 bg-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Signup</span>
          </Link>
        </div>
      </header>

      {/* Main OTP Card Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-9 border border-slate-200/90 shadow-xl shadow-slate-200/40 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-[#D71935] mb-2 shadow-sm">
              <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              Verify Your Email
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              We've sent a 6-digit verification code to your registered email address.
            </p>
          </div>

          {/* Masked Recipient Display Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-2.5">
              <span className="text-slate-500">Sent to:</span>
              <strong className="text-slate-900 font-mono text-sm tracking-wide">
                {emailParam ? getMaskedEmail(emailParam) : 'your email'}
              </strong>
            </div>
            {/* 5-minute Expiration Countdown */}
            <div className={`flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-lg ${
              expirySeconds > 60
                ? 'bg-slate-100 text-slate-600'
                : expirySeconds > 0
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{expirySeconds > 0 ? formatTime(expirySeconds) : 'Expired'}</span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug flex-1">{error}</span>
            </div>
          )}

          {/* Expiry Warning */}
          {expirySeconds === 0 && !error && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">Verification code has expired. Please click "Resend Code" below to receive a new one.</span>
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
                  Email Verified Successfully!
                </h3>
                <p className="text-xs text-slate-500">
                  Your BloodBridge account is activated and your registration is complete.
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
            <form onSubmit={handleVerify} className="space-y-5">
              {/* Six Separate Numeric Input Boxes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <div
                  className="flex justify-center items-center gap-2 sm:gap-3"
                  onPaste={handlePaste}
                >
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputsRef.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      autoComplete="off"
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-black text-xl sm:text-2xl bg-slate-50 border border-slate-300 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-[#D71935]/20 focus:border-[#D71935] transition-all shadow-inner select-none"
                    />
                  ))}
                </div>
                <p className="text-[11px] text-center text-slate-400 pt-1">
                  Check your inbox and spam folder.
                </p>
              </div>

              {/* Verify Email Button */}
              <button
                type="submit"
                disabled={loading || digits.join('').length !== 6 || expirySeconds === 0}
                className="w-full py-3.5 px-4 text-xs font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-2xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{loading ? 'Verifying...' : 'Verify Email'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Resend OTP Section */}
              <div className="text-center pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || loading}
                  className={`font-bold transition-colors flex items-center gap-1.5 ${
                    canResend
                      ? 'text-[#D71935] hover:underline cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {canResend ? 'Resend Code' : `Resend in ${cooldown}s`}
                  </span>
                </button>
              </div>

              {/* Back to Signup Link */}
              <div className="text-center pt-1">
                <Link
                  to="/signup"
                  className="text-xs text-slate-500 hover:text-[#D71935] font-semibold transition-colors"
                >
                  ← Back to Signup
                </Link>
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
