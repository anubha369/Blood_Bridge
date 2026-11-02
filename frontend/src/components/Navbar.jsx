import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  Shield,
  LogOut,
  Menu,
  X,
  Sparkles,
  Building2,
  PlusCircle,
  BookOpen,
  Award,
  User as UserIcon,
  Activity,
  ChevronDown,
  Search
} from 'lucide-react';
import { api } from '../api/client';

export default function Navbar({ onOpenAI }) {
  const { user, isAuthenticated, isAdmin, isDonor, isRequester, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [creditPoints, setCreditPoints] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && isDonor) {
      api.credits.getBalance()
        .then((res) => {
          if (res.success && res.balance !== undefined) {
            setCreditPoints(res.balance);
          }
        })
        .catch(() => {
          // Non-blocking fallback
        });
    } else {
      setCreditPoints(null);
    }
  }, [isAuthenticated, isDonor]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // On landing page and dedicated authentication pages, let their own specialized visual headers render
  if (['/', '/login', '/signup', '/verify-otp'].includes(location.pathname)) {
    return null;
  }

  // Derive initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[72px] gap-3 xl:gap-5">
          
          {/* 1. Left: Brand Identity */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0" aria-label="BloodBridge Home">
            <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shadow-rose-950/50 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
              <img
                src="/images/bloodbridge-hero-emblem-transparent.png"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/images/bloodbridge-hero-emblem.jpg';
                }}
                alt="BloodBridge Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[22px] sm:text-[23px] lg:text-[24px] font-black tracking-tight text-white leading-none">
                Blood<span className="text-[#D71935]">Bridge</span>
              </span>
              <p className="text-[11px] text-slate-400 font-semibold tracking-wide mt-1 hidden sm:block leading-none">
                Emergency Blood Coordination
              </p>
            </div>
          </Link>

          {/* 2. Center: Clean & Evenly Aligned Navigation Links */}
          <nav
            className="hidden lg:flex items-center gap-1 xl:gap-2"
            aria-label="Main Navigation"
          >
            {/* Regional Blood Banks Directory */}
            <Link
              to="/blood-banks"
              className={`h-10 px-3 xl:px-3.5 text-[15px] xl:text-[16px] font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                isActive('/blood-banks')
                  ? 'bg-slate-800 text-rose-400 border border-slate-700 shadow-sm'
                  : 'text-slate-200 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Blood Banks</span>
            </Link>

            {/* How It Works */}
            <Link
              to="/how-it-works"
              className={`h-10 px-3 xl:px-3.5 text-[15px] xl:text-[16px] font-semibold rounded-lg transition-all inline-flex items-center justify-center whitespace-nowrap ${
                isActive('/how-it-works')
                  ? 'bg-slate-800 text-rose-400 border border-slate-700 shadow-sm'
                : 'text-slate-200 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span>How It Works</span>
            </Link>

            {/* Primary Action: Create Request for Authenticated Users */}
            {isAuthenticated && (
              <Link
                to="/requests/create"
                className={`h-10 px-3.5 xl:px-4 text-[15px] xl:text-[16px] font-bold rounded-lg transition-all inline-flex items-center gap-2 whitespace-nowrap ${
                  isActive('/requests/create')
                    ? 'bg-gradient-to-r from-rose-600 to-[#D71935] text-white shadow-md shadow-rose-950/60 border border-rose-500'
                    : 'bg-rose-500/20 text-rose-300 hover:bg-gradient-to-r hover:from-rose-600 hover:to-[#D71935] hover:text-white border border-rose-500/40 shadow-sm'
                }`}
              >
                <PlusCircle className="w-4 h-4 flex-shrink-0" />
                <span>Create Request</span>
              </Link>
            )}

            {/* Dashboard Link for Requesters */}
            {isAuthenticated && (isRequester || isAdmin) && (
              <Link
                to="/requester/dashboard"
                className={`h-10 px-3 xl:px-3.5 text-[15px] xl:text-[16px] font-semibold rounded-lg transition-all inline-flex items-center justify-center whitespace-nowrap ${
                  isActive('/requester/dashboard')
                    ? 'bg-slate-800 text-rose-400 border border-slate-700 shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span>My Requests</span>
              </Link>
            )}

            {/* Dashboard Link for Donors */}
            {isAuthenticated && (isDonor || isAdmin) && (
              <Link
                to="/donor/dashboard"
                className={`h-10 px-3 xl:px-3.5 text-[15px] xl:text-[16px] font-semibold rounded-lg transition-all inline-flex items-center justify-center whitespace-nowrap ${
                  isActive('/donor/dashboard')
                    ? 'bg-slate-800 text-rose-400 border border-slate-700 shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span>Donor Portal</span>
              </Link>
            )}

            {/* Admin Console Links */}
            {isAdmin && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`h-10 px-3 text-[15px] xl:text-[16px] font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                    isActive('/admin/dashboard')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-amber-400 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
                <Link
                  to="/admin/rag"
                  className={`h-10 px-3 text-[15px] xl:text-[16px] font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                    isActive('/admin/rag')
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-indigo-400 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Knowledge</span>
                </Link>
              </>
            )}
          </nav>

          {/* 3. Right: User Controls & Identity */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-2.5 flex-shrink-0">
            {/* AI Assistant Pill */}
            <button
              type="button"
              onClick={onOpenAI}
              className="h-10 inline-flex items-center gap-1.5 px-3 text-[14px] xl:text-[15px] font-semibold text-rose-300 bg-rose-950/40 border border-rose-800/40 rounded-lg hover:bg-rose-900/50 hover:text-white transition-all shadow-sm whitespace-nowrap"
              title="Open Clinical AI Assistant"
            >
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>Clinical AI</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2 xl:gap-2.5 pl-2.5 border-l border-slate-800">
                {/* Neatly Framed Points Display for Donors */}
                {isDonor && creditPoints !== null && (
                  <Link
                    to="/donor/dashboard"
                    title="Non-monetary volunteer participation points"
                    className="h-10 inline-flex items-center gap-1.5 px-3 text-[14px] xl:text-[15px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/35 rounded-lg hover:bg-amber-500/25 transition-all shadow-sm whitespace-nowrap"
                  >
                    <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{creditPoints} Pts</span>
                  </Link>
                )}

                {/* User Identity Avatar & Role */}
                <div className="h-10 px-2.5 xl:px-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 shadow-sm">
                  <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-rose-300 flex-shrink-0">
                    {getInitials(user?.name)}
                  </div>
                  <div className="text-left hidden xl:block leading-none">
                    <div className="text-[14px] xl:text-[15px] font-bold text-white max-w-[120px] truncate">
                      {user?.name || 'User'}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider mt-0.5">
                      {user?.role || 'Member'}
                    </div>
                  </div>
                </div>

                {/* Clearly Visible & Accessible Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out of your account"
                  className="h-10 inline-flex items-center gap-2 px-3 xl:px-3.5 text-[14px] xl:text-[15px] font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-rose-950/70 border border-slate-800 hover:border-rose-800/60 rounded-lg transition-all shadow-sm group whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4 text-rose-400 transition-transform group-hover:-translate-x-0.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="h-10 px-4 text-[15px] xl:text-[16px] font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-lg shadow-sm transition-all inline-flex items-center justify-center whitespace-nowrap"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="h-10 px-4 text-[15px] xl:text-[16px] font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-all inline-flex items-center justify-center whitespace-nowrap"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* 4. Mobile Menu & AI Assistant (< lg) */}
          <div className="flex lg:hidden items-center gap-2.5">
            {isAuthenticated && isDonor && creditPoints !== null && (
              <Link
                to="/donor/dashboard"
                className="h-10 inline-flex items-center gap-1.5 px-3 text-[15px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl"
                title="Volunteer Points"
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>{creditPoints}</span>
              </Link>
            )}

            <button
              type="button"
              onClick={onOpenAI}
              className="h-10 w-10 flex items-center justify-center text-rose-400 hover:bg-slate-900 rounded-xl border border-slate-800"
              title="Clinical AI Assistant"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-10 w-10 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-900 rounded-xl border border-slate-800"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer (Clean, Spacious & Responsive) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 pt-4 pb-6 space-y-4 shadow-2xl animate-in slide-in-from-top-2">
          {isAuthenticated ? (
            <>
              {/* User Identity Header Card */}
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-rose-300 shadow-inner">
                    {getInitials(user?.name)}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-white leading-tight">{user?.name || 'User'}</div>
                    <div className="text-[11px] uppercase font-bold text-rose-400 tracking-wider mt-0.5">
                      {user?.role || 'Member'}
                    </div>
                  </div>
                </div>

                {isDonor && creditPoints !== null && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>{creditPoints} Pts</span>
                  </div>
                )}
              </div>

              {/* Navigation Links with uniform spacing & icons */}
              <div className="space-y-2 pt-1">
                <Link
                  to="/requests/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full px-4 py-3.5 text-[17px] font-bold text-rose-200 hover:text-white bg-rose-500/15 hover:bg-gradient-to-r hover:from-rose-600 hover:to-[#D71935] rounded-xl border border-rose-500/30 flex items-center gap-2.5 transition-all shadow-sm"
                >
                  <PlusCircle className="w-5 h-5 text-rose-400" />
                  <span>Create Emergency Request</span>
                </Link>

                {(isRequester || isAdmin) && (
                  <Link
                    to="/requester/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 text-[18px] font-semibold rounded-xl transition-all ${
                      isActive('/requester/dashboard')
                        ? 'bg-slate-800 text-rose-400 border border-slate-700'
                        : 'text-slate-200 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    My Requests
                  </Link>
                )}

                {(isDonor || isAdmin) && (
                  <Link
                    to="/donor/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 text-[18px] font-semibold rounded-xl transition-all ${
                      isActive('/donor/dashboard')
                        ? 'bg-slate-800 text-rose-400 border border-slate-700'
                        : 'text-slate-200 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    Donor Portal
                  </Link>
                )}

                <Link
                  to="/blood-banks"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 text-[18px] font-semibold rounded-xl transition-all flex items-center gap-2.5 ${
                    isActive('/blood-banks')
                      ? 'bg-slate-800 text-rose-400 border border-slate-700'
                      : 'text-slate-200 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-slate-400" />
                  <span>Regional Blood Banks</span>
                </Link>

                <Link
                  to="/how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 text-[18px] font-semibold rounded-xl transition-all ${
                    isActive('/how-it-works')
                      ? 'bg-slate-800 text-rose-400 border border-slate-700'
                      : 'text-slate-200 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  How It Works
                </Link>

                {isAdmin && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-3 text-[18px] font-bold text-amber-400 hover:bg-slate-900 rounded-xl flex items-center gap-2 ${
                        isActive('/admin/dashboard') ? 'bg-slate-800' : ''
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                      <span>Admin Console</span>
                    </Link>
                    <Link
                      to="/admin/rag"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-3 text-[18px] font-bold text-indigo-400 hover:bg-slate-900 rounded-xl flex items-center gap-2 ${
                        isActive('/admin/rag') ? 'bg-slate-800' : ''
                      }`}
                    >
                      <BookOpen className="w-5 h-5" />
                      <span>Knowledge Base (RAG)</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Prominent Full-Width Logout for Mobile (18–19px) */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-4 px-4 text-[18px] font-bold text-white bg-gradient-to-r from-rose-600 to-[#D71935] hover:from-rose-500 hover:to-red-600 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-rose-950/60"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2.5 pt-1">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-3.5 text-[18px] font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-xl shadow-md"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-3 text-[17px] font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-xl"
              >
                Register
              </Link>
              <Link
                to="/blood-banks"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-3 text-[17px] font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-xl"
              >
                Blood Banks
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
