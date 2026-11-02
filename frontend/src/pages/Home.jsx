import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Heart,
  Shield,
  Activity,
  Phone,
  Mail,
  X,
  Menu,
  Building2,
  Users,
  Compass,
  FileCheck,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Lock,
  ArrowUpRight
} from 'lucide-react';

export default function Home({ onOpenAI }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tab-about');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);
  const navigate = useNavigate();

  const dashboardPath = user?.role === 'admin'
    ? '/admin/dashboard'
    : user?.role === 'donor'
      ? '/donor/dashboard'
      : '/requester/dashboard';

  // If session is verifying, render a minimal clean container
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center">
        <div className="w-9 h-9 border-3 border-[#D71935] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If already authenticated, directly navigate to the appropriate portal dashboard
  if (isAuthenticated && user) {
    return <Navigate to={dashboardPath} replace />;
  }

  const openModalWithTab = (tabId, e) => {
    if (e) e.preventDefault();
    setActiveTab(tabId);
    setModalOpen(true);
    setMobileMenuOpen(false);
  };

  const toggleFaq = (idx) => {
    setFaqOpenIndex(faqOpenIndex === idx ? null : idx);
  };

  const faqItems = [
    {
      q: 'How does emergency blood matching work on BloodBridge?',
      a: 'When an emergency request is created with the patient\'s blood group and hospital location, our system performs an instant spatial lookup of compatible red blood cell donor groups (e.g. O- donors match any recipient, O+ matches all Rh+ recipients). Verified nearby donors receive an urgent notification with a 1-click option to Accept or Decline on Telegram, ensuring rapid golden-hour coordination.'
    },
    {
      q: 'Is my phone number and private address exposed to the public?',
      a: 'No. BloodBridge enforces strict privacy-preserving geo-masking. Raw GPS coordinates, exact street addresses, and donor phone numbers are never displayed publicly. Requesters only see approximate regional distance bands until a donor explicitly consents and accepts the coordination request.'
    },
    {
      q: 'Who can register as a voluntary blood donor?',
      a: 'Any healthy individual aged 18 to 65 weighing at least 45 kg with a normal hemoglobin level (>12.5 g/dL) can register. Donors must observe a mandatory 90-day recovery cooldown between whole blood donations to protect their iron stores, strictly enforced by our system.'
    },
    {
      q: 'Is there any fee or charge to request blood?',
      a: 'None. Under Section 27 of the Indian Drugs and Cosmetics Act (1940) and Supreme Court rulings, commercial buying or selling of blood is strictly illegal. BloodBridge is an entirely free, voluntary, and altruistic coordination network.'
    },
    {
      q: 'Does BloodBridge replace hospital cross-matching or blood banks?',
      a: 'No. BloodBridge is a digital discovery and emergency coordination platform, NOT a medical provider or clinical laboratory. Final blood compatibility, antibody screening, infectious disease testing (TTI), and transfusion safety decisions belong exclusively to certified pathologists and attending clinicians.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0F172A] flex flex-col justify-between font-sans selection:bg-[#D71935] selection:text-white">
      
      {/* ======================================================================
          1. MINIMAL, ELEGANT NAVIGATION BAR
          ====================================================================== */}
      <header className="w-full bg-[#FAF9F6]/95 backdrop-blur-md border-b border-slate-200/90 z-30 sticky top-0" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 lg:h-[72px] flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="BloodBridge Platform Home">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shadow-rose-950/20 group-hover:scale-105 transition-transform duration-300 border border-slate-200 overflow-hidden">
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
            <div className="flex items-baseline gap-1">
              <span className="text-[23px] sm:text-[25px] font-black tracking-tight text-[#0F172A]">
                Blood<span className="text-[#D71935]">Bridge</span>
              </span>
            </div>
          </Link>

          {/* Center Navigation Links: Home, Blood Banks, How It Works, About, FAQ */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-7" aria-label="Primary Navigation">
            <Link
              to="/"
              className="text-[16px] xl:text-[17px] font-bold text-[#0F172A] relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#D71935]"
              aria-current="page"
            >
              Home
            </Link>
            <Link
              to="/blood-banks"
              className="text-[16px] xl:text-[17px] font-semibold text-slate-700 hover:text-[#D71935] transition-colors py-1 flex items-center gap-1.5"
            >
              <Building2 className="w-4.5 h-4.5 text-slate-400" />
              <span>Blood Banks</span>
            </Link>
            <Link
              to="/how-it-works"
              className="text-[16px] xl:text-[17px] font-semibold text-slate-700 hover:text-[#D71935] transition-colors py-1"
            >
              How It Works
            </Link>
            <button
              type="button"
              onClick={(e) => openModalWithTab('tab-about', e)}
              className="text-[16px] xl:text-[17px] font-semibold text-slate-700 hover:text-[#D71935] transition-colors py-1"
            >
              About
            </button>
            <button
              type="button"
              onClick={(e) => openModalWithTab('tab-faq', e)}
              className="text-[16px] xl:text-[17px] font-semibold text-slate-700 hover:text-[#D71935] transition-colors py-1"
            >
              FAQ
            </button>
          </nav>

          {/* Right Area: Clean Header without duplicate action buttons */}
          <div className="hidden sm:flex items-center gap-3.5" />

          {/* Mobile hamburger menu toggle */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-slate-700 hover:text-[#0F172A] rounded-xl hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-[#FAF9F6] px-5 pt-4 pb-6 space-y-3 shadow-xl">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 text-[18px] font-bold text-[#D71935]"
            >
              Home
            </Link>
            <Link
              to="/blood-banks"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 text-[18px] font-semibold text-slate-700"
            >
              Blood Banks
            </Link>
            <Link
              to="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 text-[18px] font-semibold text-slate-700"
            >
              How It Works
            </Link>
            <button
              type="button"
              onClick={(e) => openModalWithTab('tab-about', e)}
              className="block w-full text-left py-2.5 text-[18px] font-semibold text-slate-700"
            >
              About BloodBridge
            </button>
            <button
              type="button"
              onClick={(e) => openModalWithTab('tab-faq', e)}
              className="block w-full text-left py-2 text-[17px] font-semibold text-slate-700"
            >
              FAQ
            </button>
            <div className="pt-3 border-t border-slate-200">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full block text-center py-3 text-[17px] font-bold text-white bg-[#D71935] rounded-xl shadow-md"
              >
                Log In
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ======================================================================
          SECTION A: HERO (Balanced Two-Column: 46% Expanded Text, 54% Dominant Right Artwork)
          ====================================================================== */}
      <section className="relative pt-10 sm:pt-14 lg:pt-16 pb-16 sm:pb-24 overflow-hidden bg-gradient-to-b from-[#FAF9F6] via-[#FFF5F5]/60 to-[#FAF9F6]" aria-labelledby="heroHeadline">
        {/* Subtle Ambient Red Gradient Accent Wash */}
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(215,25,53,0.06),rgba(250,249,246,0))] pointer-events-none -z-10"
          aria-hidden="true"
        />
        {/* Soft upper-right blush glow blending towards hero artwork */}
        <div
          className="absolute -top-32 right-[-5%] w-[600px] lg:w-[750px] h-[600px] lg:h-[750px] bg-gradient-to-bl from-rose-200/35 via-red-100/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10"
          aria-hidden="true"
        />
        {/* Subtle bottom-left deep burgundy-to-crimson ambient glow */}
        <div
          className="absolute -bottom-24 left-[-5%] w-[450px] lg:w-[550px] h-[450px] lg:h-[550px] bg-gradient-to-tr from-[#881337]/08 via-[#D71935]/05 to-transparent rounded-full blur-3xl pointer-events-none -z-10"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-8 xl:gap-14">
            
            {/* Left Column: Expanded Text Area (approx 46-48% width) */}
            <div className="w-full lg:w-[48%] xl:w-[46%] flex flex-col justify-center space-y-6 sm:space-y-7 xl:space-y-8 text-left">
              
              {/* Trust-oriented Eyebrow Badge with subtle burgundy/crimson glow */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-50/95 via-red-50/80 to-rose-50/95 border border-rose-200/80 text-[#881337] shadow-[0_2px_10px_rgba(215,25,53,0.05)] self-start">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D71935] shadow-[0_0_8px_rgba(215,25,53,0.5)] animate-pulse" aria-hidden="true"></span>
                <span className="text-[13px] sm:text-[14px] font-extrabold tracking-wider uppercase">
                  Emergency Blood Coordination
                </span>
              </div>

              {/* 1. Brand Heading */}
              <div>
                <h1
                  id="heroHeadline"
                  className="text-5xl sm:text-6xl lg:text-[70px] xl:text-[76px] font-black tracking-tight leading-[1.0] text-[#0F172A]"
                >
                  Blood<span className="bg-gradient-to-r from-[#D71935] via-[#BE123C] to-[#881337] bg-clip-text text-transparent">Bridge</span>
                </h1>
              </div>

              {/* 2. Main Hero Heading */}
              <div className="space-y-1.5">
                <h2 className="text-3xl sm:text-4xl lg:text-[38px] xl:text-[42px] font-extrabold text-slate-800 tracking-tight leading-[1.18]">
                  Bridging the Gap Between
                </h2>
                <div className="text-3xl sm:text-4xl lg:text-[38px] xl:text-[42px] font-extrabold tracking-tight leading-[1.18]">
                  <span className="text-[#0F172A]">Need</span>{' '}
                  <span className="text-slate-400 font-normal">and</span>{' '}
                  <span className="bg-gradient-to-r from-[#D71935] to-[#881337] bg-clip-text text-transparent">Hope</span>
                </div>
              </div>

              {/* 3. Supporting Description */}
              <p className="text-[19px] sm:text-[20px] lg:text-[20.5px] text-slate-600 leading-relaxed font-normal">
                A platform that connects blood donors with those in need, helping save lives, one drop at a time.
              </p>

              {/* Single, Clearly Visible Login Option with subtle burgundy-to-crimson gradient & gentle glow */}
              <div className="pt-2 flex items-center">
                <Link
                  to="/login"
                  id="heroLoginBtn"
                  className="inline-flex items-center justify-center gap-3 px-10 py-4 text-[18px] sm:text-[19px] font-bold text-white bg-gradient-to-r from-[#881337] via-[#D71935] to-[#BE123C] hover:from-[#70102b] hover:via-[#c0152e] hover:to-[#a81034] rounded-2xl shadow-[0_10px_25px_-5px_rgba(215,25,53,0.30)] hover:shadow-[0_15px_30px_-5px_rgba(136,19,55,0.38)] hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  <Lock className="w-5 h-5 text-white" />
                  <span>Log In</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Trust Indicators with soft rose-tinted divider */}
              <div className="pt-6 border-t border-rose-200/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[14px] sm:text-[15px] text-slate-600 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Verified Donors</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Privacy-First</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>NBTC Guidelines</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>100% Unpaid</span>
                </div>
              </div>
            </div>

            {/* Right Column: Dominant Naturally Blended Hero Emblem (approx 52-54% width, shifted to right) */}
            <div className="w-full lg:w-[52%] xl:w-[54%] relative flex flex-col items-center lg:items-end justify-center">
              {/* Soft burgundy-to-crimson radial glow behind and around emblem */}
              <div
                className="absolute -inset-4 sm:-inset-8 bg-gradient-to-tr from-[#881337]/16 via-[#D71935]/14 to-rose-200/25 rounded-full blur-3xl pointer-events-none -z-10"
                aria-hidden="true"
              />
              <div
                className="absolute inset-2 sm:inset-6 bg-[radial-gradient(circle_at_50%_50%,rgba(215,25,53,0.12)_0%,rgba(136,19,55,0.06)_45%,transparent_75%)] rounded-full blur-2xl pointer-events-none -z-10"
                aria-hidden="true"
              />

              {/* Soft-Edge Blended Emblem Container — Dominant Visual Element */}
              <div className="relative w-full max-w-[660px] xl:max-w-[720px] flex flex-col items-center lg:items-end justify-center p-2 sm:p-4">
                <div
                  className="relative w-full aspect-[16/9] flex items-center justify-center transition-transform duration-700 hover:scale-[1.015]"
                  style={{
                    maskImage: 'radial-gradient(ellipse 95% 90% at 50% 50%, black 75%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 95% 90% at 50% 50%, black 75%, transparent 100%)'
                  }}
                >
                  <img
                    src="/images/bloodbridge-hero-emblem-transparent.png"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/bloodbridge-hero-emblem.jpg';
                    }}
                    alt="BloodBridge official emblem: Donate • Connect • Save Lives"
                    className="w-full h-full object-contain filter drop-shadow-[0_8px_24px_rgba(136,19,55,0.08)] select-none"
                    style={{ mixBlendMode: 'multiply' }}
                    loading="eager"
                  />
                </div>

                {/* Floating Tasteful Trust Pill with soft rose-tinted glass */}
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-rose-100/80 shadow-[0_4px_20px_rgba(136,19,55,0.06)] text-slate-700 mt-3 self-center lg:self-end">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" aria-hidden="true"></span>
                  <span className="text-[14px] sm:text-[15px] font-bold text-[#0F172A]">
                    Clinical Coordination Active
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#881337]">
                    <Shield className="w-3.5 h-3.5 text-[#D71935]" />
                    <span>NBTC Standards</span>
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION B: HOW BLOODBRIDGE WORKS (Horizontal 4-Step Emergency Workflow)
          ====================================================================== */}
      <section className="py-16 sm:py-24 bg-white border-y border-slate-200/90" aria-labelledby="howItWorksHeading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header (36–44px Desktop, 29–34px Mobile) */}
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-14 sm:mb-16">
            <span className="text-[15px] font-extrabold uppercase tracking-widest text-[#881337]">
              Simple 4-Step Emergency Journey
            </span>
            <h2 id="howItWorksHeading" className="text-3xl sm:text-[38px] lg:text-[42px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
              How BloodBridge Works
            </h2>
            <p className="text-[18px] sm:text-[19px] text-slate-600 leading-relaxed font-normal">
              Designed for critical golden hours: clear, deterministic, and friction-free when minutes matter most.
            </p>
          </div>

          {/* 4 Process Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="p-7 rounded-3xl bg-[#FAF9F6] border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-[18px] text-[#881337] shadow-sm">
                  01
                </div>
                <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A]">
                  Post Emergency Request
                </h3>
                <p className="text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
                  Specify blood group, units, hospital name, and city. No bureaucratic delays or unnecessary signups during emergencies.
                </p>
              </div>
              <Link
                to="/how-it-works"
                className="pt-2 text-[15px] font-bold text-[#881337] flex items-center gap-1 hover:underline"
              >
                <span>Emergency coordination protocol</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Step 2 */}
            <div className="p-7 rounded-3xl bg-[#FAF9F6] border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-[18px] text-[#881337] shadow-sm">
                  02
                </div>
                <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A]">
                  Spatial Candidate Matching
                </h3>
                <p className="text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
                  Deterministic PostGIS algorithms cross-match compatible ABO/Rh donors and nearby certified blood banks within geographic radius.
                </p>
              </div>
              <div className="pt-2 text-[15px] font-bold text-[#881337] flex items-center gap-1">
                <span>RBC compatibility logic</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-7 rounded-3xl bg-[#FAF9F6] border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-[18px] text-[#881337] shadow-sm">
                  03
                </div>
                <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A]">
                  Consent-Based Alert
                </h3>
                <p className="text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
                  Eligible donors receive structured Telegram notifications with 1-click Accept / Decline buttons. Donor privacy is strictly protected.
                </p>
              </div>
              <div className="pt-2 text-[15px] font-bold text-[#881337] flex items-center gap-1">
                <span>Zero phone spam</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-7 rounded-3xl bg-[#FAF9F6] border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-[18px] text-[#881337] shadow-sm">
                  04
                </div>
                <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A]">
                  Clinical Verification
                </h3>
                <p className="text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
                  Donor arrives at designated hospital blood bank. Certified medical personnel conduct final antibody screening and cross-matching.
                </p>
              </div>
              <div className="pt-2 text-[15px] font-bold text-[#881337] flex items-center gap-1">
                <span>Medical safety confirmed</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION C: VERIFIED BLOOD BANKS CALLOUT (Premier UP Institutions)
          ====================================================================== */}
      <section className="py-14 sm:py-18 bg-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/20 text-rose-300 rounded-full text-[14px] font-bold">
                <Building2 className="w-4 h-4 text-rose-400" />
                <span>Verified Regional Blood Bank Directory</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-white leading-tight">
                Looking for Government &amp; Certified Blood Centres?
              </h2>
              <p className="text-[17px] sm:text-[18px] text-slate-300 leading-relaxed font-normal">
                Access verified contact numbers, operating hours, and location details for premier medical institutions across Uttar Pradesh (KGMU, SGPGI, IMS-BHU, GSVM, SNMC).
              </p>
            </div>
            <Link
              to="/blood-banks"
              className="px-8 py-4 text-[17px] font-bold text-white bg-[#D71935] hover:bg-[#be123c] rounded-2xl transition-all shadow-lg shadow-rose-950/40 flex items-center gap-2.5 flex-shrink-0 self-start lg:self-center"
            >
              <span>Browse UP Blood Banks</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION D: WHY BLOODBRIDGE? (Real Platform Capabilities)
          ====================================================================== */}
      <section className="py-16 sm:py-24 bg-white border-t border-slate-200/90" aria-labelledby="whyBloodBridgeHeading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-14 sm:mb-16">
            <span className="text-[15px] font-extrabold uppercase tracking-widest text-[#881337]">
              Platform Capabilities
            </span>
            <h2 id="whyBloodBridgeHeading" className="text-3xl sm:text-[38px] lg:text-[42px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
              Why BloodBridge?
            </h2>
            <p className="text-[18px] sm:text-[19px] text-slate-600 leading-relaxed font-normal">
              Engineered to replace social media chaos with deterministic, verified, and safe healthcare coordination.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-[#FAF9F6] border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#D71935] flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A]">
                Organized Emergency Coordination
              </h3>
              <p className="text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
                Structured workflow ensures hospital ICU and emergency teams coordinate directly with donors, eliminating viral miscommunication and false alarms.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-[#FAF9F6] border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A]">
                Approximate Spatial Discovery
              </h3>
              <p className="text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
                PostGIS spatial indexing calculates real-time proximity to hospital emergency desks while keeping private residential addresses protected.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-[#FAF9F6] border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A]">
                Consent-Based Donor Contact
              </h3>
              <p className="text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
                Donors are never harassed by cold calls. Interactive Telegram dispatches respect donor autonomy and require voluntary consent before details are unlocked.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-[#FAF9F6] border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A]">
                90-Day Cooldown Protection
              </h3>
              <p className="text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
                Protects donor health by automatically enforcing a 3-month physiological recovery window after each whole-blood donation in compliance with NBTC guidelines.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-[#FAF9F6] border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A]">
                Certified Blood Bank Referral
              </h3>
              <p className="text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
                Direct integration with regional licensed blood banks across Uttar Pradesh, providing emergency telephone helplines and certified storage locations.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-3xl bg-[#FAF9F6] border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A]">
                Strict Zero-Commercial Policy
              </h3>
              <p className="text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
                Under Section 27 of the Drugs and Cosmetics Act, commercial trading or paid blood sales are strictly prohibited. BloodBridge is 100% voluntary and altruistic.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION E: CLINICAL BOUNDARIES & ETHICS
          ====================================================================== */}
      <section className="py-16 sm:py-20 bg-[#FAF9F6] border-t border-slate-200/90" aria-labelledby="transparencyHeading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 space-y-6 shadow-sm">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#881337] flex items-center justify-center font-bold">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="transparencyHeading" className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                    Clinical Boundaries &amp; Donor Trust
                  </h2>
                  <p className="text-[15px] text-slate-500">
                    Our strict operational framework for clinical and patient safety
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[14px] font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>NBTC Compliant Guidelines</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[17px] sm:text-[18px] text-slate-700 leading-relaxed">
              <div className="space-y-3">
                <h3 className="font-bold text-[#0F172A] text-[20px] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D71935]"></span>
                  Preliminary Discovery vs. Medical Confirmation
                </h3>
                <p>
                  Blood group compatibility and spatial radius searches generated by BloodBridge are informational coordination indicators. They do <strong>never</strong> represent medical confirmation of compatibility. All cross-matching, Transfusion-Transmissible Infection (TTI) testing, and blood safety releases belong exclusively to authorized hospital clinicians and certified blood bank pathologists.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-[#0F172A] text-[20px] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D71935]"></span>
                  Donor Consent &amp; Privacy Safeguards
                </h3>
                <p>
                  We treat donor personal data with the highest medical ethics. Volunteer contact information is never sold, shared with third-party advertisers, or displayed publicly. Contact is initiated only with explicit consent through verified Telegram coordination channels for active clinical emergencies.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION F: FINAL CTA ("Be Someone's Reason to Hope")
          ====================================================================== */}
      <section className="py-20 sm:py-28 bg-[#0F172A] text-white relative overflow-hidden" aria-labelledby="ctaHeading">
        
        {/* Soft Background Radial Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#881337]/30 rounded-full blur-[90px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-rose-300 text-[14px] font-bold tracking-wider uppercase">
            <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
            <span>Join the Coordination Network</span>
          </div>

          <h2 id="ctaHeading" className="text-4xl sm:text-5xl lg:text-[58px] font-black tracking-tight text-white leading-tight">
            Be Someone's Reason to Hope.
          </h2>

          <p className="text-[18px] sm:text-[20px] text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Whether you are registering as an emergency donor or coordinating blood for a loved one, BloodBridge makes every second count.
          </p>

          <div className="pt-4 flex items-center justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2.5 px-9 py-4 text-[17px] sm:text-[18px] font-bold text-white bg-[#D71935] hover:bg-[#BE123C] rounded-2xl shadow-xl shadow-rose-950/40 transition-all group"
            >
              <Lock className="w-5 h-5" />
              <span>Log In to Get Started</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

        </div>
      </section>

      {/* ======================================================================
          SECTION G: SOPHISTICATED FOOTER
          ====================================================================== */}
      <footer className="bg-white border-t border-slate-200/90 text-slate-700" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            
            {/* Col 1: Brand & Emergency Helplines */}
            <div className="space-y-4 md:col-span-1">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#881337] to-[#D71935] flex items-center justify-center text-white">
                  <Heart className="w-4 h-4 fill-white" />
                </div>
                <span className="text-[22px] font-black text-[#0F172A]">
                  Blood<span className="text-[#D71935]">Bridge</span>
                </span>
              </Link>
              <p className="text-[16px] sm:text-[17px] text-slate-600 leading-relaxed">
                Emergency blood discovery and coordination network built for rapid golden-hour response across Uttar Pradesh.
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[15px] space-y-1.5 text-slate-800">
                <strong className="block text-[#0F172A] text-[16px]">UP Health Helplines:</strong>
                <div>Blood Availability: <strong className="text-[#881337]">1910</strong></div>
                <div>State Health Helpline: <strong className="text-[#881337]">104</strong></div>
                <div>Emergency Ambulance: <strong className="text-[#881337]">108 / 102</strong></div>
              </div>
            </div>

            {/* Col 2: Coordination Services */}
            <div className="space-y-3">
              <h4 className="text-[18px] font-bold text-[#0F172A] uppercase tracking-wider">
                Coordination Services
              </h4>
              <ul className="space-y-2 text-[16px] sm:text-[17px]">
                <li>
                  <Link
                    to="/login"
                    className="hover:text-[#D71935] transition-colors"
                  >
                    Log In to Coordinate Blood
                  </Link>
                </li>
                <li>
                  <Link to="/blood-banks" className="hover:text-[#D71935] transition-colors">
                    Verified Blood Banks Directory
                  </Link>
                </li>
                <li>
                  <Link
                    to="/how-it-works"
                    className="hover:text-[#D71935] transition-colors"
                  >
                    Clinical Coordination Protocol
                  </Link>
                </li>
                <li>
                  <Link to="/blood-donation-info" className="hover:text-[#D71935] transition-colors">
                    Donor Eligibility &amp; NBTC Guidelines
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Company & Portals */}
            <div className="space-y-3">
              <h4 className="text-[18px] font-bold text-[#0F172A] uppercase tracking-wider">
                Portals &amp; FAQs
              </h4>
              <ul className="space-y-2 text-[16px] sm:text-[17px]">
                <li>
                  <button
                    type="button"
                    onClick={(e) => openModalWithTab('tab-about', e)}
                    className="text-left hover:text-[#D71935] transition-colors"
                  >
                    About BloodBridge
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => openModalWithTab('tab-faq', e)}
                    className="text-left hover:text-[#D71935] transition-colors"
                  >
                    Frequently Asked Questions
                  </button>
                </li>
                <li>
                  <Link to="/requester/dashboard" className="hover:text-[#D71935] transition-colors">
                    Requester Portal
                  </Link>
                </li>
                <li>
                  <Link to="/donor/dashboard" className="hover:text-[#D71935] transition-colors">
                    Donor Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-[#D71935] transition-colors">
                    Healthcare Portal Sign In
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Legal & Clinical Notice */}
            <div className="space-y-3">
              <h4 className="text-[18px] font-bold text-[#0F172A] uppercase tracking-wider">
                Clinical &amp; Privacy Ethics
              </h4>
              <p className="text-[15px] sm:text-[16px] text-slate-600 leading-relaxed">
                BloodBridge facilitates preliminary coordination. All transfusion compatibility testing and blood release decisions belong exclusively to certified medical professionals.
              </p>
              <div className="pt-1 flex flex-col gap-1.5 text-[15px] sm:text-[16px]">
                <Link to="/privacy-policy" className="hover:text-[#D71935] underline transition-colors">
                  Privacy Policy &amp; Geo-Masking
                </Link>
                <Link to="/terms" className="hover:text-[#D71935] underline transition-colors">
                  Terms of Use &amp; Clinical Boundaries
                </Link>
              </div>
            </div>

          </div>

          <div className="mt-12 pt-6 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-[15px] text-slate-500">
            <p>© 2026 BloodBridge. All rights reserved.</p>
            <p className="text-[14px]">
              Strictly Voluntary &amp; Altruistic • Compliant with Section 27 Drugs &amp; Cosmetics Act
            </p>
          </div>
        </div>
      </footer>

      {/* ======================================================================
          ACCESSIBLE MODAL DIALOG (About, How It Works, FAQ, Emergency Contact)
          ====================================================================== */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalDialogTitle"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close Information Modal"
            >
              <X className="w-6 h-6" />
            </button>

            <div>
              <div className="text-[14px] font-extrabold uppercase tracking-widest text-[#881337]">
                HEALTHCARE INFORMATION
              </div>
              <h2 id="modalDialogTitle" className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                BloodBridge Network
              </h2>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 gap-4 overflow-x-auto pb-0.5" role="tablist">
              <button
                type="button"
                onClick={() => setActiveTab('tab-about')}
                className={`pb-2.5 text-[16px] sm:text-[17px] font-bold border-b-2 whitespace-nowrap transition-all ${
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
                className={`pb-2.5 text-[16px] sm:text-[17px] font-bold border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'tab-how'
                    ? 'border-[#D71935] text-[#D71935]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                role="tab"
                aria-selected={activeTab === 'tab-how'}
              >
                Workflow
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tab-faq')}
                className={`pb-2.5 text-[16px] sm:text-[17px] font-bold border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'tab-faq'
                    ? 'border-[#D71935] text-[#D71935]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                role="tab"
                aria-selected={activeTab === 'tab-faq'}
              >
                FAQ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tab-contact')}
                className={`pb-2.5 text-[16px] sm:text-[17px] font-bold border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'tab-contact'
                    ? 'border-[#D71935] text-[#D71935]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                role="tab"
                aria-selected={activeTab === 'tab-contact'}
              >
                Helplines
              </button>
            </div>

            {/* Tab 1: About */}
            {activeTab === 'tab-about' && (
              <div className="space-y-4 text-[16px] sm:text-[17px] text-slate-700 leading-relaxed animate-in fade-in">
                <p>
                  BloodBridge is an emergency blood coordination infrastructure engineered to bridge the critical gap between blood need and hope during golden medical hours.
                </p>
                <p>
                  Unlike generic bulletin boards or unverified social media forwards, BloodBridge coordinates deterministic ABO/Rh red blood cell matching and contacts consenting donors via direct, consent-gated Telegram channels.
                </p>
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-950 space-y-1">
                  <strong className="block text-[#881337] font-extrabold text-[17px]">Our Mission</strong>
                  <p>Zero lives lost due to delays in finding compatible blood in an emergency.</p>
                </div>
              </div>
            )}

            {/* Tab 2: How It Works */}
            {activeTab === 'tab-how' && (
              <div className="space-y-4 text-[16px] sm:text-[17px] text-slate-700 leading-relaxed animate-in fade-in">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="w-8 h-8 rounded-full bg-rose-100 text-[#881337] font-extrabold flex items-center justify-center text-sm flex-shrink-0">1</span>
                    <p><strong>Post Request:</strong> Enter patient blood group, units needed, and hospital location without red tape.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-8 h-8 rounded-full bg-rose-100 text-[#881337] font-extrabold flex items-center justify-center text-sm flex-shrink-0">2</span>
                    <p><strong>Spatial Match:</strong> PostGIS spatial queries locate nearby compatible donors and verified regional blood banks.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-8 h-8 rounded-full bg-rose-100 text-[#881337] font-extrabold flex items-center justify-center text-sm flex-shrink-0">3</span>
                    <p><strong>Consent-Based Notification:</strong> Telegram alerts prompt donors to Accept or Decline with 1 click.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-8 h-8 rounded-full bg-rose-100 text-[#881337] font-extrabold flex items-center justify-center text-sm flex-shrink-0">4</span>
                    <p><strong>Clinical Delivery:</strong> Hospital pathologists perform final antibody screening and transfusion.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Interactive FAQ Accordion */}
            {activeTab === 'tab-faq' && (
              <div className="space-y-3 animate-in fade-in">
                {faqItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full p-4 text-left font-bold text-[#0F172A] text-[16px] sm:text-[17px] flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <span>{item.q}</span>
                      <ChevronRight
                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                          faqOpenIndex === idx ? 'rotate-90 text-[#D71935]' : ''
                        }`}
                      />
                    </button>
                    {faqOpenIndex === idx && (
                      <div className="p-4 pt-0 text-[16px] text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Emergency Helplines */}
            {activeTab === 'tab-contact' && (
              <div className="space-y-4 text-[16px] sm:text-[17px] text-slate-700 leading-relaxed animate-in fade-in">
                <p>For immediate institutional assistance across Uttar Pradesh, dial authorized government numbers:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[14px] text-slate-500 block">Blood Helpline</span>
                    <span className="text-2xl font-black text-[#881337]">1910</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[14px] text-slate-500 block">State Health Helpline</span>
                    <span className="text-2xl font-black text-[#881337]">104</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[14px] text-slate-500 block">Emergency Ambulance</span>
                    <span className="text-2xl font-black text-[#881337]">108 / 102</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[14px] text-slate-500 block">National Emergency</span>
                    <span className="text-2xl font-black text-[#881337]">112</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 text-[16px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
