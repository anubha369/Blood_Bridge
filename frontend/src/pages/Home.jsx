import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  Heart,
  Shield,
  Activity,
  Phone,
  Mail,
  X,
  Menu
} from 'lucide-react';

export default function Home({ onOpenAI }) {
  const { user, isAuthenticated } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tab-about');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const dashboardPath = user?.role === 'admin'
    ? '/admin/dashboard'
    : user?.role === 'donor'
      ? '/donor/dashboard'
      : '/requester/dashboard';

  const openModalWithTab = (tabId, e) => {
    if (e) e.preventDefault();
    setActiveTab(tabId);
    setModalOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-[#D71935] selection:text-white">
      {/* ======================================================================
          Area 1: Compact Navigation Header (~90px tall)
          ====================================================================== */}
      <header className="w-full bg-white border-b border-slate-100 z-30 sticky top-0" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-24 flex items-center justify-between">
          {/* Logo — top left */}
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="BloodBridge Platform Home">
            {/* Small crimson outline blood-drop icon */}
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
            <span className="text-2xl sm:text-[26px] font-extrabold tracking-tight">
              <span className="text-[#D71935]">Blood</span>
              <span className="text-[#0F172A]">Bridge</span>
            </span>
          </Link>

          {/* Center navigation */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-9" aria-label="Primary Navigation">
            <Link
              to="/"
              className="text-sm font-bold text-[#0F172A] relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#D71935]"
              aria-current="page"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={(e) => openModalWithTab('tab-about', e)}
              className="text-sm font-semibold text-slate-600 hover:text-[#D71935] transition-colors py-1"
            >
              About
            </button>
            <button
              type="button"
              onClick={(e) => openModalWithTab('tab-contact', e)}
              className="text-sm font-semibold text-slate-600 hover:text-[#D71935] transition-colors py-1"
            >
              Contact
            </button>
          </nav>

          {/* Mobile hamburger toggle button (only on mobile) */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-[#D71935] rounded-xl hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-[#D71935]"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={(e) => openModalWithTab('tab-about', e)}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-700"
            >
              About
            </button>
            <button
              type="button"
              onClick={(e) => openModalWithTab('tab-contact', e)}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-700"
            >
              Contact
            </button>
          </div>
        )}
      </header>

      {/* ======================================================================
          Area 2: Main Hero (Two Columns: Text on Left, Animation on Right)
          ====================================================================== */}
      <main className="flex-1 flex items-center py-6 sm:py-12 relative z-10" id="mainContent" role="main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column (approx 45–48% of available width) */}
            <div className="lg:col-span-5 space-y-6 sm:space-y-8">
              {/* Small Eyebrow Label */}
              <div className="inline-flex items-center gap-3">
                <span className="w-8 h-[2px] bg-[#D71935] rounded-full" aria-hidden="true"></span>
                <span className="text-[11px] sm:text-xs font-black tracking-widest uppercase text-slate-500">
                  BLOOD DONATION PLATFORM
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl sm:text-6xl lg:text-[68px] font-black tracking-tight leading-[1.05]">
                <span className="text-[#D71935]">Blood</span>
                <span className="text-[#0F172A]">Bridge</span>
              </h1>

              {/* Tagline */}
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-slate-800 tracking-tight">
                  Bridging the gap between
                </div>
                <div className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight">
                  <span className="text-[#0F172A]">Need</span>{' '}
                  <span className="text-slate-400 font-normal">and</span>{' '}
                  <span className="text-[#D71935]">Hope</span>
                </div>
              </div>

              {/* Supporting Description */}
              <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-md font-normal">
                A platform that connects blood donors with those in need, helping save lives, one drop at a time.
              </p>

              {/* Additional Quick Access Link for Emergency Action */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to="/requests/create"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#D71935]"
                >
                  <Activity className="w-3.5 h-3.5 text-[#D71935]" />
                  <span>Post Urgent Request</span>
                </Link>
                <span className="text-slate-300">•</span>
                <Link
                  to="/blood-banks"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#D71935]"
                >
                  <Heart className="w-3.5 h-3.5 text-[#D71935]" />
                  <span>Regional Blood Centres</span>
                </Link>
              </div>
            </div>

            {/* Right Column: High-Quality Static Hero Image & Single Login Button */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-6 lg:pl-4">
              {/* Static Hero Image */}
              <div
                className="w-full max-w-[620px] bg-slate-50/60 rounded-3xl p-3 sm:p-4 border border-slate-100 shadow-sm relative overflow-hidden group"
                aria-label="Healthcare coordination and blood donation"
              >
                <img
                  src="/images/blood-donation-hero.jpg"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/blood-donation-hero.svg';
                  }}
                  alt="Healthcare professional and blood donor in modern clinic"
                  className="w-full h-auto max-h-[380px] object-cover rounded-2xl shadow-sm transition-transform duration-500 group-hover:scale-[1.01]"
                  loading="eager"
                />
              </div>

              {/* Single, Clearly Visible Login Option */}
              <div className="w-full flex items-center justify-center pt-1">
                <Link
                  to={isAuthenticated ? dashboardPath : '/login'}
                  id="heroLoginBtn"
                  className="w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center gap-2.5 px-9 py-4 bg-[#D71935] hover:bg-[#be123c] text-white font-bold text-sm sm:text-base rounded-full shadow-lg shadow-rose-200 transition-all group"
                >
                  <span>{isAuthenticated ? 'Go to Dashboard' : 'Login'}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================================
          Area 3: Bottom Decorative Element
          Subtle flowing line with small outline heart near bottom-left corner
          ====================================================================== */}
      <div className="w-full overflow-hidden pointer-events-none relative z-0 h-28 sm:h-36 mt-auto" aria-hidden="true">
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 640 160"
          fill="none"
          preserveAspectRatio="none"
        >
          {/* Soft oversized blush-pink curved shape in the bottom-left corner */}
          <path d="M-60 160 C 20 60, 180 80, 300 160 Z" fill="#FFF0F3" opacity="0.75" />

          {/* Thin pale-crimson wave entering from outside left viewport edge */}
          <path
            d="M -40 135 C 30 115, 80 88, 142 66"
            stroke="rgba(215, 25, 53, 0.45)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Small integrated outline heart near left quarter */}
          <path
            d="M 160 74 C 158 64, 146 58, 138 66 C 128 76, 136 90, 160 110 C 184 90, 192 76, 182 66 C 174 58, 162 64, 160 74 Z"
            stroke="rgba(215, 25, 53, 0.52)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Continuation of wave moving toward lower middle area */}
          <path
            d="M 178 74 C 230 102, 320 128, 440 105 C 510 92, 580 114, 650 135"
            stroke="rgba(215, 25, 53, 0.45)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ======================================================================
          Accessible Healthcare Information Dialog (Learn More & Nav Links)
          ====================================================================== */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalDialogTitle"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close Information Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-[#D71935]">
                HEALTHCARE PLATFORM BRIEF
              </div>
              <h2 id="modalDialogTitle" className="text-2xl font-black text-[#0F172A] tracking-tight">
                BloodBridge Network
              </h2>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 gap-4" role="tablist">
              <button
                type="button"
                onClick={() => setActiveTab('tab-about')}
                className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'tab-about'
                    ? 'border-[#D71935] text-[#D71935]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                role="tab"
                aria-selected={activeTab === 'tab-about'}
              >
                About Platform
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tab-how')}
                className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'tab-how'
                    ? 'border-[#D71935] text-[#D71935]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                role="tab"
                aria-selected={activeTab === 'tab-how'}
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tab-contact')}
                className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'tab-contact'
                    ? 'border-[#D71935] text-[#D71935]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                role="tab"
                aria-selected={activeTab === 'tab-contact'}
              >
                Emergency &amp; Contact
              </button>
            </div>

            {/* Tab 1: About */}
            {activeTab === 'tab-about' && (
              <div className="space-y-4 text-xs sm:text-sm text-slate-600">
                <p className="leading-relaxed">
                  BloodBridge bridges the critical time gap between blood donors and recipients. Our automated platform
                  coordinates certified blood banks, registered voluntary donors, and emergency trauma centers to save lives.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">100% Certified Donors:</strong> Rigorous antigen verification and
                      certified safe donation records.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">Rapid Hospital Dispatch:</strong> Real-time alerts match urgent hospital
                      requests with nearby compatible donors.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">Cold-Chain Monitored:</strong> Secure logistics tracking ensuring blood
                      integrity from collection to transfusion.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: How It Works */}
            {activeTab === 'tab-how' && (
              <div className="space-y-4 text-xs sm:text-sm text-slate-600">
                <p className="leading-relaxed">
                  A seamless 3-step digital bridge ensuring patients receive compatible blood units within critical golden hours:
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-200 text-[#D71935] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      1
                    </div>
                    <span>
                      <strong className="text-slate-900">Request or Register:</strong> Hospitals broadcast verified blood group
                      requirements; donors register availability.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-200 text-[#D71935] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      2
                    </div>
                    <span>
                      <strong className="text-slate-900">Smart Compatibility Match:</strong> Algorithms cross-match ABO/Rh typing
                      and geographic proximity immediately.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-200 text-[#D71935] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      3
                    </div>
                    <span>
                      <strong className="text-slate-900">Direct Connection:</strong> Donors arrive at certified collection points;
                      units are safely transported to recipients.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Contact & Emergency */}
            {activeTab === 'tab-contact' && (
              <div className="space-y-4 text-xs sm:text-sm text-slate-600">
                <p className="leading-relaxed">
                  For urgent patient requests, clinical hospital onboarding, or technical assistance:
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-[#D71935] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">24/7 Emergency Dispatch Desk:</strong> 1-800-555-BLOOD (1-800-555-2566)
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-[#D71935] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">Clinical Coordination:</strong> hospital-desk@bloodbridge.org
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-[#D71935] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">Operating Hours:</strong> Real-time automated system operating 24 hours,
                      365 days.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Dialog Footer Actions */}
            <div className="pt-2 flex justify-end">
              <Link
                to="/login"
                onClick={() => setModalOpen(false)}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-full shadow-md shadow-rose-200 transition-all"
              >
                <span>Go to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
