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
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand Identity (Clean BloodBridge without "Vision-X") */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/60 group-hover:scale-105 transition-transform duration-300">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block">
                BloodBridge
              </span>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Emergency Blood Coordination
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5" aria-label="Main Navigation">
            {/* Find Donors (Public / Universal) */}
            <Link
              to="/donors/nearby"
              className={`px-3.5 py-2 text-[17px] font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                isActive('/donors/nearby')
                  ? 'bg-slate-800 text-rose-400 border border-slate-700'
                  : 'text-slate-200 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Search className="w-4 h-4 text-rose-400" />
              <span>Find Donors</span>
            </Link>

            {/* Regional Blood Banks Directory */}
            <Link
              to="/blood-banks"
              className={`px-3.5 py-2 text-[17px] font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                isActive('/blood-banks')
                  ? 'bg-slate-800 text-rose-400 border border-slate-700'
                  : 'text-slate-200 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Blood Banks</span>
            </Link>

            {/* How It Works */}
            <Link
              to="/how-it-works"
              className={`px-3.5 py-2 text-[17px] font-semibold rounded-xl transition-all ${
                isActive('/how-it-works')
                  ? 'bg-slate-800 text-rose-400 border border-slate-700'
                  : 'text-slate-200 hover:text-white hover:bg-slate-900'
              }`}
            >
              How It Works
            </Link>

            {/* Primary Action: Create Request for Authenticated Users */}
            {isAuthenticated && (
              <Link
                to="/requests/create"
                className={`px-4 py-2 text-[17px] font-bold rounded-xl transition-all flex items-center gap-2 ${
                  isActive('/requests/create')
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                    : 'bg-rose-500/15 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30'
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
                className={`px-3.5 py-2 text-[17px] font-semibold rounded-xl transition-all ${
                  isActive('/requester/dashboard')
                    ? 'bg-slate-800 text-rose-400 border border-slate-700'
                    : 'text-slate-200 hover:text-white hover:bg-slate-900'
                }`}
              >
                My Requests
              </Link>
            )}

            {/* Dashboard Link for Donors */}
            {isAuthenticated && (isDonor || isAdmin) && (
              <Link
                to="/donor/dashboard"
                className={`px-3.5 py-2 text-[17px] font-semibold rounded-xl transition-all ${
                  isActive('/donor/dashboard')
                    ? 'bg-slate-800 text-rose-400 border border-slate-700'
                    : 'text-slate-200 hover:text-white hover:bg-slate-900'
                }`}
              >
                Donor Portal
              </Link>
            )}

            {/* Admin Console Links */}
            {isAdmin && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`px-3.5 py-2 text-[17px] font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    isActive('/admin/dashboard')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-amber-400 hover:bg-slate-900'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
                <Link
                  to="/admin/rag"
                  className={`px-3.5 py-2 text-[17px] font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    isActive('/admin/rag')
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-indigo-400 hover:bg-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Knowledge</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Area: AI Assistant, Points, User Profile, Request Blood & Logout */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            {/* AI Assistant Pill */}
            <button
              type="button"
              onClick={onOpenAI}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[16px] font-semibold text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl hover:bg-rose-900/50 transition-all shadow-sm"
              title="Open Clinical AI Assistant"
            >
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>AI Assistant</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3 lg:gap-4 pl-3 border-l border-slate-800">
                {/* Neatly Framed Points Display for Donors */}
                {isDonor && creditPoints !== null && (
                  <Link
                    to="/donor/dashboard"
                    title="Non-monetary volunteer participation points"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[15px] font-extrabold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all shadow-sm"
                  >
                    <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{creditPoints} Pts</span>
                  </Link>
                )}

                {/* User Identity Avatar & Role */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-extrabold text-white shadow-inner">
                    {getInitials(user?.name)}
                  </div>
                  <div className="text-left hidden xl:block">
                    <div className="text-[15px] font-bold text-white max-w-[130px] truncate leading-tight">
                      {user?.name || 'User'}
                    </div>
                    <div className="text-[11px] uppercase font-bold text-rose-400 tracking-wider">
                      {user?.role || 'Member'}
                    </div>
                  </div>
                </div>

                {/* Clearly Visible & Accessible Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out of your account"
                  className="inline-flex items-center gap-2 px-4 py-2 text-[16px] font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-700/60 rounded-xl transition-all shadow-sm group"
                >
                  <LogOut className="w-4 h-4 text-rose-400 transition-transform group-hover:-translate-x-0.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-5 py-2.5 text-[16px] font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-xl shadow-md transition-all shadow-rose-950 flex items-center gap-1.5"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2.5 text-[16px] font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu & AI Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={onOpenAI}
              className="p-2 text-rose-400 hover:bg-slate-900 rounded-xl border border-slate-800"
              title="BloodBridge Assistant"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-200 hover:text-white hover:bg-slate-900 rounded-xl border border-slate-800"
              aria-label="Toggle Dashboard Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Clean, Spacious & Responsive) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 pt-4 pb-6 space-y-3 shadow-2xl animate-in slide-in-from-top-2">
          {isAuthenticated ? (
            <>
              {/* User Identity Header */}
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white">
                    {getInitials(user?.name)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{user?.name}</div>
                    <div className="text-[11px] uppercase font-bold text-rose-400 tracking-wider">
                      {user?.role}
                    </div>
                  </div>
                </div>

                {isDonor && creditPoints !== null && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>{creditPoints} Pts</span>
                  </div>
                )}
              </div>

              {/* Navigation Links */}
              <div className="space-y-1.5 pt-1">
                <Link
                  to="/requests/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-[17px] font-bold text-rose-300 hover:bg-slate-900 rounded-xl border border-rose-500/20 bg-rose-500/10 flex items-center gap-2"
                >
                  <PlusCircle className="w-5 h-5 text-rose-400" />
                  <span>Create Emergency Request</span>
                </Link>

                <Link
                  to="/donors/nearby"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-[17px] font-semibold text-slate-200 hover:bg-slate-900 rounded-xl flex items-center gap-2"
                >
                  <Search className="w-4 h-4 text-rose-400" />
                  <span>Find Donors</span>
                </Link>

                {(isRequester || isAdmin) && (
                  <Link
                    to="/requester/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 text-[17px] font-semibold text-slate-200 hover:bg-slate-900 rounded-xl"
                  >
                    My Requests
                  </Link>
                )}

                {(isDonor || isAdmin) && (
                  <Link
                    to="/donor/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 text-[17px] font-semibold text-slate-200 hover:bg-slate-900 rounded-xl"
                  >
                    Donor Portal
                  </Link>
                )}

                <Link
                  to="/blood-banks"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-[17px] font-semibold text-slate-200 hover:bg-slate-900 rounded-xl flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Regional Blood Banks</span>
                </Link>

                <Link
                  to="/how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-[17px] font-semibold text-slate-200 hover:bg-slate-900 rounded-xl"
                >
                  How It Works
                </Link>

                {isAdmin && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2.5 text-[17px] font-bold text-amber-400 hover:bg-slate-900 rounded-xl flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Console</span>
                    </Link>
                    <Link
                      to="/admin/rag"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2.5 text-[17px] font-bold text-indigo-400 hover:bg-slate-900 rounded-xl flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Knowledge Base (RAG)</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Prominent Full-Width Logout for Mobile */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 px-4 text-[17px] font-bold text-white bg-rose-600/90 hover:bg-rose-600 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2.5 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-3 text-[17px] font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-xl shadow-md"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2.5 text-[17px] font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-xl"
              >
                Register
              </Link>
              <Link
                to="/donors/nearby"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2.5 text-[17px] font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-xl"
              >
                Find Donors
              </Link>
              <Link
                to="/blood-banks"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2.5 text-[17px] font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-xl"
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
