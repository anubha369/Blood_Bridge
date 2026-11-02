import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const { user, isAuthenticated } = useAuth();
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
      <header className="w-full bg-[#FAF9F6]/90 backdrop-blur-md border-b border-slate-200/80 z-30 sticky top-0" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="BloodBridge Platform Home">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#881337] via-[#D71935] to-[#BE123C] flex items-center justify-center text-white shadow-md shadow-rose-950/20 group-hover:scale-105 transition-transform duration-300">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tracking-tight text-[#0F172A]">
                Blood<span className="text-[#D71935]">Bridge</span>
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Clean & Uncluttered: Home, About, Blood Banks, FAQ) */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10" aria-label="Primary Navigation">
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
              className="text-sm font-semibold text-slate-600 hover:text-[#0F172A] transition-colors py-1"
            >
              About
            </button>
            <Link
              to="/blood-banks"
              className="text-sm font-semibold text-slate-600 hover:text-[#0F172A] transition-colors py-1 flex items-center gap-1.5"
            >
              <span>Blood Banks</span>
            </Link>
            <button
              type="button"
              onClick={(e) => openModalWithTab('tab-faq', e)}
              className="text-sm font-semibold text-slate-600 hover:text-[#0F172A] transition-colors py-1"
            >
              FAQ
            </button>
          </nav>

          {/* Right Action: Single Login & Prominent Request Blood CTA */}
          <div className="hidden sm:flex items-center gap-4">
            <Link
              to={isAuthenticated ? dashboardPath : '/login'}
              className="text-sm font-bold text-slate-700 hover:text-[#0F172A] px-3 py-2 rounded-xl transition-colors"
            >
              {isAuthenticated ? 'My Dashboard' : 'Log In'}
            </Link>

            {/* Primary Navigation CTA */}
            <Link
              to="/requests/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#D71935] hover:bg-[#BE123C] rounded-full shadow-md shadow-rose-950/15 hover:shadow-lg hover:shadow-rose-900/25 transition-all group"
            >
              <Activity className="w-3.5 h-3.5 text-white" />
              <span>Request Blood</span>
            </Link>
          </div>

          {/* Mobile hamburger menu toggle */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              to="/requests/create"
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#D71935] rounded-full"
            >
              Request
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-[#0F172A] rounded-xl hover:bg-slate-100"
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
            <Link
              to="/blood-banks"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700"
            >
              Blood Banks
            </Link>
            <button
              type="button"
              onClick={(e) => openModalWithTab('tab-faq', e)}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-700"
            >
              FAQ
            </button>
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2.5">
              <Link
                to={isAuthenticated ? dashboardPath : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Log In'}
              </Link>
              <Link
                to="/requests/create"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-bold text-white bg-[#D71935] rounded-xl shadow-md"
              >
                Request Blood
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ======================================================================
          SECTION A: HERO (Editorial Photograph + Emergency-First UX)
          ====================================================================== */}
      <section className="relative pt-8 sm:pt-14 lg:pt-20 pb-16 sm:pb-24 overflow-hidden" aria-labelledby="heroHeadline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            {/* Left Column: Memorable Headline & Clear CTAs */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-8 text-left">
              
              {/* Trust-oriented Eyebrow Badge */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200/80 text-[#881337]">
                <span className="w-2 h-2 rounded-full bg-[#D71935] animate-pulse" aria-hidden="true"></span>
                <span className="text-[11px] sm:text-xs font-extrabold tracking-wider uppercase">
                  Emergency Blood Coordination Network
                </span>
              </div>

              {/* Memorable Headline */}
              <div className="space-y-2">
                <h1
                  id="heroHeadline"
                  className="text-4xl sm:text-5xl lg:text-[62px] font-black text-[#0F172A] tracking-tight leading-[1.08]"
                >
                  Every Drop Matters.<br />
                  <span className="text-[#881337]">Every Connection Counts.</span>
                </h1>
              </div>

              {/* Supporting Copy */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl">
                Connecting people, donors, and healthcare facilities through a smarter emergency blood coordination network.
              </p>

              {/* Emergency-First CTAs (Clearly Differentiated) */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {/* Primary CTA: Request Blood (Rich Crimson) */}
                <Link
                  to="/requests/create"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 text-sm sm:text-base font-bold text-white bg-[#D71935] hover:bg-[#BE123C] rounded-2xl shadow-lg shadow-rose-950/20 hover:shadow-xl hover:shadow-rose-900/30 transition-all group"
                >
                  <Activity className="w-5 h-5 text-white" />
                  <span>Request Blood</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                {/* Secondary CTA: Become a Donor (Midnight Navy) */}
                <Link
                  to={isAuthenticated ? '/donor/dashboard' : '/signup?role=donor'}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 text-sm sm:text-base font-bold text-[#0F172A] bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-[#0F172A] rounded-2xl shadow-sm transition-all"
                >
                  <Heart className="w-4 h-4 text-[#D71935]" />
                  <span>Become a Donor</span>
                </Link>
              </div>

              {/* Small Trust Indicators */}
              <div className="pt-4 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-500 font-semibold">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Verified Donors</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Privacy-First</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>NBTC Guidelines</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Zero Fees</span>
                </div>
              </div>
            </div>

            {/* Right Column: High-End Editorial Photograph */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-[560px] relative">
                
                {/* Architectural Framing Container */}
                <div className="relative rounded-[32px] overflow-hidden bg-white p-2.5 sm:p-3 border border-slate-200/90 shadow-2xl shadow-slate-900/10">
                  <div className="relative rounded-[24px] overflow-hidden aspect-[4/3] bg-slate-100">
                    <img
                      src="/images/blood-donation-hero.jpg"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/images/blood-donation-hero.svg';
                      }}
                      alt="Compassionate healthcare specialist holding hands with a smiling volunteer donor in a modern clinic"
                      className="w-full h-full object-cover object-center transform transition-transform duration-700 hover:scale-[1.02]"
                      loading="eager"
                    />

                    {/* Subtle Gradient Scrim at Bottom of Photo */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

                    {/* Integrated On-Image Status Pill */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Clinical Matching Protocol Active</span>
                      </div>
                      <span className="text-[10px] text-slate-300 font-normal hidden sm:inline">
                        NBTC Standards
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtle Floating Feature Badge (Top-Right) */}
                <div className="absolute -top-4 -right-4 sm:-top-5 sm:-right-5 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xl hidden sm:flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#D71935] flex items-center justify-center font-bold">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-extrabold text-[#0F172A]">Safe &amp; Altruistic</div>
                    <div className="text-[10px] text-slate-400 font-medium">100% Unpaid Donation</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION B: HOW BLOODBRIDGE WORKS (Horizontal Process Layout)
          ====================================================================== */}
      <section className="py-16 sm:py-24 bg-white border-y border-slate-200/80" aria-labelledby="howItWorksHeading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-14 sm:mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#881337]">
              Simple 4-Step Process
            </span>
            <h2 id="howItWorksHeading" className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              How BloodBridge Works
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed font-normal">
              Designed for critical golden hours: clear, deterministic, and friction-free when minutes matter most.
            </p>
          </div>

          {/* 4 Process Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-[#FAF9F6] border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-sm text-[#881337] shadow-sm">
                  01
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Post Emergency Request
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter required blood group, units, hospital name, and city. No bureaucratic delays or unnecessary signups during emergencies.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-bold text-[#881337] flex items-center gap-1">
                <span>Immediate broadcast</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-[#FAF9F6] border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-sm text-[#881337] shadow-sm">
                  02
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Spatial Candidate Matching
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Deterministic PostGIS algorithms cross-match compatible ABO/Rh donors and nearby certified blood banks within geographic radius.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-bold text-[#881337] flex items-center gap-1">
                <span>RBC compatibility logic</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-[#FAF9F6] border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-sm text-[#881337] shadow-sm">
                  03
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Consent-Based Alert
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Eligible donors receive structured Telegram notifications with 1-click Accept / Decline buttons. Donor privacy is strictly protected.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-bold text-[#881337] flex items-center gap-1">
                <span>Zero phone spam</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-[#FAF9F6] border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-sm text-[#881337] shadow-sm">
                  04
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Clinical Verification
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Donor arrives at the designated hospital blood bank. Certified medical personnel conduct final antibody screening and cross-matching.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-bold text-[#881337] flex items-center gap-1">
                <span>Medical safety confirmed</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION C: WHY BLOODBRIDGE? (Real Platform Capabilities)
          ====================================================================== */}
      <section className="py-16 sm:py-24 bg-[#FAF9F6]" aria-labelledby="whyBloodBridgeHeading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-14 sm:mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#881337]">
              Platform Capabilities
            </span>
            <h2 id="whyBloodBridgeHeading" className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Why BloodBridge?
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed font-normal">
              Engineered to replace social media chaos with deterministic, verified, and safe healthcare coordination.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-[#D71935] flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Organized Emergency Coordination
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Structured workflow ensures hospital ICU and emergency teams coordinate directly with donors, eliminating viral miscommunication and false alarms.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Approximate Location-Based Discovery
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                PostGIS spatial indexing calculates real-time proximity to hospital emergency desks while keeping private residential addresses protected.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Consent-Based Donor Contact
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Donors are never harassed by cold calls. Interactive Telegram dispatches respect donor autonomy and require voluntary consent before details are unlocked.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                90-Day Cooldown Protection
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Protects donor health by automatically enforcing a 3-month physiological recovery window after each whole-blood donation in compliance with NBTC guidelines.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Certified Blood Bank Referral
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct integration with regional licensed blood banks across Uttar Pradesh, providing emergency telephone helplines and certified storage locations.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Strict Zero-Commercial Policy
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Under Section 27 of the Drugs and Cosmetics Act, commercial trading or paid blood sales are strictly prohibited. BloodBridge is 100% voluntary and altruistic.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION D: TRUST AND TRANSPARENCY (Clinical Boundaries & Ethics)
          ====================================================================== */}
      <section className="py-16 sm:py-20 bg-white border-t border-slate-200/80" aria-labelledby="transparencyHeading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#FAF9F6] border border-slate-200 rounded-3xl p-8 sm:p-12 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#881337] flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="transparencyHeading" className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                    Clinical Boundaries &amp; Donor Trust
                  </h2>
                  <p className="text-xs text-slate-500">
                    Our strict operational framework for clinical and patient safety
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>NBTC Compliant Guidelines</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="space-y-3">
                <h3 className="font-bold text-[#0F172A] text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D71935]"></span>
                  Preliminary Discovery vs. Medical Confirmation
                </h3>
                <p>
                  Blood group compatibility and spatial radius searches generated by BloodBridge are informational coordination indicators. They do <strong>never</strong> represent medical confirmation of compatibility. All cross-matching, Transfusion-Transmissible Infection (TTI) testing, and blood safety releases belong exclusively to authorized hospital clinicians and certified blood bank pathologists.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-[#0F172A] text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D71935]"></span>
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
          SECTION E: FINAL CTA ("Be Someone's Reason to Hope")
          ====================================================================== */}
      <section className="py-20 sm:py-28 bg-[#0F172A] text-white relative overflow-hidden" aria-labelledby="ctaHeading">
        
        {/* Soft Background Radial Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#881337]/30 rounded-full blur-[90px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-rose-300 text-xs font-bold tracking-wider uppercase">
            <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
            <span>Join the Coordination Network</span>
          </div>

          <h2 id="ctaHeading" className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Be Someone's Reason to Hope.
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Whether you are registering as an emergency donor or coordinating blood for a loved one, BloodBridge makes every second count.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={isAuthenticated ? '/donor/dashboard' : '/signup?role=donor'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-sm sm:text-base font-bold text-[#0F172A] bg-white hover:bg-slate-100 rounded-2xl shadow-xl transition-all"
            >
              <Heart className="w-4 h-4 text-[#D71935]" />
              <span>Become a Donor</span>
            </Link>

            <Link
              to="/requests/create"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-sm sm:text-base font-bold text-white bg-[#D71935] hover:bg-[#BE123C] rounded-2xl shadow-xl shadow-rose-950/40 transition-all group"
            >
              <Activity className="w-4 h-4" />
              <span>Request Blood</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

        </div>
      </section>

      {/* ======================================================================
          SECTION F: SOPHISTICATED FOOTER
          ====================================================================== */}
      <footer className="bg-white border-t border-slate-200/80 text-slate-600" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            
            {/* Col 1: Brand & Emergency Helplines */}
            <div className="space-y-4 md:col-span-1">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#881337] to-[#D71935] flex items-center justify-center text-white">
                  <Heart className="w-4 h-4 fill-white" />
                </div>
                <span className="text-xl font-black text-[#0F172A]">
                  Blood<span className="text-[#D71935]">Bridge</span>
                </span>
              </Link>
              <p className="text-xs text-slate-500 leading-relaxed">
                Emergency blood discovery and coordination network built for rapid golden-hour response across Uttar Pradesh.
              </p>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] space-y-1 text-slate-700">
                <strong className="block text-[#0F172A]">UP Health Helplines:</strong>
                <div>Blood Availability: <strong className="text-[#881337]">1910</strong></div>
                <div>State Health Helpline: <strong className="text-[#881337]">104</strong></div>
                <div>Emergency Ambulance: <strong className="text-[#881337]">108 / 102</strong></div>
              </div>
            </div>

            {/* Col 2: Coordination Services */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Coordination Services
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/requests/create" className="hover:text-[#D71935] transition-colors">
                    Create Emergency Request
                  </Link>
                </li>
                <li>
                  <Link to="/blood-banks" className="hover:text-[#D71935] transition-colors">
                    Verified Blood Banks Directory
                  </Link>
                </li>
                <li>
                  <Link to="/blood-donation-info" className="hover:text-[#D71935] transition-colors">
                    Donor Eligibility &amp; NBTC Guidelines
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => openModalWithTab('tab-how', e)}
                    className="text-left hover:text-[#D71935] transition-colors"
                  >
                    Clinical Coordination Workflow
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Company & Portals */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Portals &amp; FAQs
              </h4>
              <ul className="space-y-2 text-xs">
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
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Clinical &amp; Privacy Ethics
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                BloodBridge facilitates preliminary coordination. All transfusion compatibility testing and blood release decisions belong exclusively to certified medical professionals.
              </p>
              <div className="pt-1 flex flex-col gap-1 text-xs">
                <Link to="/privacy-policy" className="hover:text-[#D71935] underline transition-colors">
                  Privacy Policy &amp; Geo-Masking
                </Link>
                <Link to="/terms" className="hover:text-[#D71935] underline transition-colors">
                  Terms of Use &amp; Clinical Boundaries
                </Link>
              </div>
            </div>

          </div>

          <div className="mt-12 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>© 2026 BloodBridge. All rights reserved.</p>
            <p className="text-[11px]">
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
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#881337]">
                HEALTHCARE INFORMATION
              </div>
              <h2 id="modalDialogTitle" className="text-2xl font-black text-[#0F172A] tracking-tight">
                BloodBridge Network
              </h2>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 gap-4 overflow-x-auto pb-0.5" role="tablist">
              <button
                type="button"
                onClick={() => setActiveTab('tab-about')}
                className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
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
                className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
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
                className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
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
                className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'tab-contact'
                    ? 'border-[#D71935] text-[#D71935]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                role="tab"
                aria-selected={activeTab === 'tab-contact'}
              >
                Emergency Helplines
              </button>
            </div>

            {/* Tab 1: About */}
            {activeTab === 'tab-about' && (
              <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <p>
                  BloodBridge is an emergency blood coordination infrastructure engineered to connect patients, voluntary donors, and certified blood centres rapidly, transparently, and safely across Uttar Pradesh.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">Deterministic Compatibility:</strong> Strict red blood cell antigen compatibility rules based on clinical hematology standards.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">Privacy Geo-Masking:</strong> Donors' private addresses are shielded; only regional distance bands are shared with hospital desks.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">100% Voluntary &amp; Unpaid:</strong> Strictly altruistic under Indian healthcare regulations with zero commercial transaction fees.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Workflow */}
            {activeTab === 'tab-how' && (
              <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <p>
                  A streamlined emergency coordination process connecting patients with nearby compatible voluntary donors:
                </p>
                <div className="space-y-3 pt-1">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="block text-[#0F172A] text-xs font-bold mb-1">1. Hospital Request</strong>
                    Enter patient's ABO/Rh group and hospital location to trigger immediate local matching.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="block text-[#0F172A] text-xs font-bold mb-1">2. Consent-Based Alert</strong>
                    Eligible nearby donors receive instant alerts via Telegram with 1-click Accept / Decline.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="block text-[#0F172A] text-xs font-bold mb-1">3. Clinical Transfusion</strong>
                    Attending hospital clinicians verify, cross-match, and safely perform the transfusion.
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: FAQ */}
            {activeTab === 'tab-faq' && (
              <div className="space-y-3">
                {faqItems.map((item, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full p-3.5 text-left text-xs sm:text-sm font-bold text-[#0F172A] bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-3 transition-colors"
                    >
                      <span>{item.q}</span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${faqOpenIndex === idx ? 'rotate-90 text-[#D71935]' : ''}`} />
                    </button>
                    {faqOpenIndex === idx && (
                      <div className="p-4 text-xs text-slate-600 bg-white leading-relaxed border-t border-slate-100">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Emergency Contacts */}
            {activeTab === 'tab-contact' && (
              <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <p>
                  Official emergency dispatch helplines and healthcare assistance:
                </p>
                <div className="space-y-2.5 pt-1">
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <strong className="block text-[#881337] text-xs font-bold">Uttar Pradesh Blood Availability Helpline</strong>
                      <span className="text-[11px] text-slate-500">24/7 centralized helpline for blood units</span>
                    </div>
                    <span className="text-base font-black text-[#881337]">1910</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <strong className="block text-[#0F172A] text-xs font-bold">State Health Helpline</strong>
                      <span className="text-[11px] text-slate-500">Emergency medical guidance</span>
                    </div>
                    <span className="text-base font-black text-slate-800">104</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <strong className="block text-[#0F172A] text-xs font-bold">Ambulance Emergency</strong>
                      <span className="text-[11px] text-slate-500">Government ambulance service</span>
                    </div>
                    <span className="text-base font-black text-slate-800">108 / 102</span>
                  </div>
                </div>
              </div>
            )}

            {/* Dialog Footer Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                BloodBridge Emergency Coordination
              </span>
              <div className="flex gap-2">
                <Link
                  to="/requests/create"
                  onClick={() => setModalOpen(false)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#D71935] hover:bg-[#BE123C] rounded-full shadow-md transition-all"
                >
                  <span>Request Blood</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
