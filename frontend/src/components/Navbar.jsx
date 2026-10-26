import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Activity, Search, Shield, User, LogOut, Menu, X, Sparkles, Building2, PlusCircle, BookOpen } from 'lucide-react';

export default function Navbar({ onOpenAI }) {
  const { user, isAuthenticated, isAdmin, isDonor, isRequester, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-md shadow-rose-200 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                BloodBridge
              </span>
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 rounded-md">
                Vision-X
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to="/donors/nearby"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/donors/nearby') ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Search className="w-4 h-4 text-rose-500" />
              Find Donors
            </Link>

            <Link
              to="/blood-banks"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/blood-banks') ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              Blood Banks
            </Link>

            <Link
              to="/how-it-works"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/how-it-works') ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              How It Works
            </Link>

            {/* Role Specific Navigation */}
            {isAuthenticated && (
              <>
                <Link
                  to="/requests/create"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    isActive('/requests/create') ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-rose-600" />
                  Create Request
                </Link>

                <Link
                  to="/requester/dashboard"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/requester/dashboard') ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  My Requests
                </Link>

                <Link
                  to="/donor/dashboard"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/donor/dashboard') ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Donor Portal
                </Link>

                {isAdmin && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                        isActive('/admin/dashboard') ? 'bg-amber-100 text-amber-900' : 'text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-amber-600" />
                      Admin Console
                    </Link>
                    <Link
                      to="/admin/rag"
                      className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                        isActive('/admin/rag') ? 'bg-indigo-100 text-indigo-900' : 'text-indigo-800 hover:bg-indigo-50'
                      }`}
                    >
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      RAG Knowledge
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full hover:bg-rose-100 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-600" />
              <span>Groq AI Assistant</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800">{user.name}</div>
                  <div className="text-[10px] uppercase font-semibold text-rose-600 tracking-wider">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all shadow-rose-200 hover:shadow"
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
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
              title="Groq AI Assistant"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2">
          <Link
            to="/donors/nearby"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Find Donors
          </Link>
          <Link
            to="/blood-banks"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Blood Banks
          </Link>
          <Link
            to="/how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium rounded-lg text-slate-700 hover:bg-slate-50"
          >
            How It Works
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/requests/create"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                + Create Blood Request
              </Link>
              <Link
                to="/requester/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                My Requests
              </Link>
              <Link
                to="/donor/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Donor Portal
              </Link>
              {isAdmin && (
                <>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-amber-800 hover:bg-amber-50 rounded-lg"
                  >
                    Admin Console
                  </Link>
                  <Link
                    to="/admin/rag"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-indigo-800 hover:bg-indigo-50 rounded-lg"
                  >
                    RAG Knowledge Base
                  </Link>
                </>
              )}
              <div className="pt-4 border-t border-slate-200">
                <div className="px-3 text-sm font-semibold text-slate-900">{user.name} ({user.role})</div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="mt-2 w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg shadow-sm"
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
