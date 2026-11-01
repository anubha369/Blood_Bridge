import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Search, Shield, LogOut, Menu, X, Sparkles, Building2, PlusCircle, BookOpen, Award } from 'lucide-react';
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
          if (res.success) {
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

  return (
    <header className="sticky top-0 z-40 bg-navy-950/95 backdrop-blur border-b border-navy-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-md shadow-rose-950 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white">
                  BloodBridge
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md">
                  Vision-X
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Emergency Blood Coordination</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to="/donors/nearby"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/donors/nearby')
                  ? 'bg-navy-800 text-rose-400 border border-navy-700'
                  : 'text-slate-300 hover:text-white hover:bg-navy-900'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-rose-400" />
              Find Donors
            </Link>

            <Link
              to="/blood-banks"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/blood-banks')
                  ? 'bg-navy-800 text-rose-400 border border-navy-700'
                  : 'text-slate-300 hover:text-white hover:bg-navy-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Blood Banks
            </Link>

            <Link
              to="/how-it-works"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                isActive('/how-it-works')
                  ? 'bg-navy-800 text-rose-400 border border-navy-700'
                  : 'text-slate-300 hover:text-white hover:bg-navy-900'
              }`}
            >
              How It Works
            </Link>

            {/* Role Specific Navigation */}
            {isAuthenticated && (
              <>
                <Link
                  to="/requests/create"
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    isActive('/requests/create')
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-400 hover:text-rose-300 hover:bg-navy-900'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create Request
                </Link>

                <Link
                  to="/requester/dashboard"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isActive('/requester/dashboard')
                      ? 'bg-navy-800 text-rose-400 border border-navy-700'
                      : 'text-slate-300 hover:text-white hover:bg-navy-900'
                  }`}
                >
                  My Requests
                </Link>

                <Link
                  to="/donor/dashboard"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isActive('/donor/dashboard')
                      ? 'bg-navy-800 text-rose-400 border border-navy-700'
                      : 'text-slate-300 hover:text-white hover:bg-navy-900'
                  }`}
                >
                  Donor Portal
                </Link>

                {isAdmin && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                        isActive('/admin/dashboard')
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-amber-400 hover:bg-navy-900'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Admin
                    </Link>
                    <Link
                      to="/admin/rag"
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                        isActive('/admin/rag')
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'text-indigo-400 hover:bg-navy-900'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      RAG
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* AI Assistant Pill */}
            <button
              onClick={onOpenAI}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-full hover:bg-rose-900/60 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>AI Assistant</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3 pl-2 border-l border-navy-800">
                {/* Credit Points Badge */}
                {isDonor && creditPoints !== null && (
                  <Link
                    to="/donor/dashboard"
                    title="Non-monetary volunteer participation points"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-full hover:bg-amber-950/80 transition-all"
                  >
                    <Award className="w-3 h-3 text-amber-400" />
                    <span>{creditPoints} Pts</span>
                  </Link>
                )}

                <div className="text-right">
                  <div className="text-xs font-bold text-white">{user.name}</div>
                  <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-navy-900 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-navy-900 rounded-lg transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all shadow-rose-950"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenAI}
              className="p-2 text-rose-400 hover:bg-navy-900 rounded-lg"
              title="BloodBridge Assistant"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-navy-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-navy-800 bg-navy-950 px-4 pt-3 pb-6 space-y-2">
          <Link
            to="/donors/nearby"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-navy-900"
          >
            Find Donors
          </Link>
          <Link
            to="/blood-banks"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-navy-900"
          >
            Blood Banks
          </Link>
          <Link
            to="/how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-navy-900"
          >
            How It Works
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/requests/create"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-bold text-rose-400 hover:bg-navy-900 rounded-lg"
              >
                + Create Emergency Request
              </Link>
              <Link
                to="/requester/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-navy-900 rounded-lg"
              >
                My Requests
              </Link>
              <Link
                to="/donor/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-navy-900 rounded-lg flex items-center justify-between"
              >
                <span>Donor Portal</span>
                {creditPoints !== null && (
                  <span className="text-xs font-black text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {creditPoints} Pts
                  </span>
                )}
              </Link>
              {isAdmin && (
                <>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-bold text-amber-300 hover:bg-navy-900 rounded-lg"
                  >
                    Admin Console
                  </Link>
                  <Link
                    to="/admin/rag"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-bold text-indigo-300 hover:bg-navy-900 rounded-lg"
                  >
                    RAG Knowledge Base
                  </Link>
                </>
              )}
              <div className="pt-4 border-t border-navy-800">
                <div className="px-3 text-xs font-semibold text-slate-300">
                  {user.name} <span className="text-rose-400 uppercase font-bold text-[10px]">({user.role})</span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="mt-2 w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-navy-900 rounded-lg"
                >
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-4 border-t border-navy-800 space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 text-xs font-bold text-slate-200 border border-navy-700 rounded-lg hover:bg-navy-900"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 text-xs font-bold text-white bg-rose-600 rounded-lg shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
