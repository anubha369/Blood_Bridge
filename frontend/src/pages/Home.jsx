import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Heart,
  Shield,
  Activity,
  Sparkles,
  Building2,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Award,
  AlertTriangle,
  PhoneCall,
  Check
} from 'lucide-react';

export default function Home({ onOpenAI }) {
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [city, setCity] = useState('Lucknow');
  const [radius, setRadius] = useState(25);
  const navigate = useNavigate();

  const handleQuickSearch = (e) => {
    e.preventDefault();
    navigate(`/donors/nearby?city=${encodeURIComponent(city)}&blood_group=${encodeURIComponent(bloodGroup)}&radius_km=${radius}`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section — Deep Navy / Dark Blue Theme */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-slate-900 text-white pt-16 pb-24 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Heading, Primary & Secondary CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-full text-xs font-bold tracking-wide uppercase">
                <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                Emergency Blood Coordination • India Rollout
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12]">
                In a critical emergency, <br />
                <span className="bg-gradient-to-r from-rose-400 via-rose-300 to-red-400 bg-clip-text text-transparent">
                  every second matters.
                </span><br />
                Find verified blood options.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
                BloodBridge Vision-X connects urgent blood requirements with verified regional blood centres and consenting voluntary donors through a rapid, privacy-conscious workflow.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {/* 1. Highly Visible 'Find Blood Now' CTA */}
                <Link
                  to="/requests/create"
                  className="px-7 py-4 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-900/60 hover:shadow-xl transition-all flex items-center gap-2.5 group"
                >
                  <Search className="w-4 h-4 text-white" />
                  <span>Find Blood Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                {/* 2. Secondary 'Register as a Donor' CTA */}
                <Link
                  to="/donor/registration"
                  className="px-6 py-4 text-sm font-bold text-white bg-navy-800/90 hover:bg-navy-700/90 border border-slate-600 rounded-xl transition-all flex items-center gap-2"
                >
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span>Register as a Donor</span>
                </Link>

                <button
                  onClick={onOpenAI}
                  className="px-4 py-4 text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                  title="Ask BloodBridge Assistant"
                >
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <span>Smart Assistant</span>
                </button>
              </div>

              {/* Trust Safeguards */}
              <div className="pt-4 flex flex-wrap items-center gap-5 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  Zero Coordinate Exposure
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  Consent-Gated Matching
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  3-Month Cooldown Enforced
                </span>
              </div>
            </div>

            {/* Right Column: Direct Quick Search Box */}
            <div className="lg:col-span-5">
              <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <Search className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-900">Immediate Search</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    PostGIS Spatial
                  </span>
                </div>

                <form onSubmit={handleQuickSearch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Required Blood Group
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setBloodGroup(grp)}
                          className={`py-2 text-xs font-black rounded-xl border transition-all ${
                            bloodGroup === grp
                              ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {grp}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      Location (City / District)
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      <option value="Lucknow">Lucknow (Uttar Pradesh)</option>
                      <option value="Kanpur">Kanpur (Uttar Pradesh)</option>
                      <option value="Varanasi">Varanasi (Uttar Pradesh)</option>
                      <option value="Prayagraj">Prayagraj (Uttar Pradesh)</option>
                      <option value="Agra">Agra (Uttar Pradesh)</option>
                      <option value="Ghaziabad">Ghaziabad (Uttar Pradesh)</option>
                      <option value="Noida">Noida (Uttar Pradesh)</option>
                      <option value="Bareilly">Bareilly (Uttar Pradesh)</option>
                      <option value="Gorakhpur">Gorakhpur (Uttar Pradesh)</option>
                      <option value="Jaipur">Jaipur (Rajasthan)</option>
                      <option value="Delhi">Delhi (NCR)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Search Radius</span>
                      <span className="text-rose-600 font-mono">{radius} km</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={radius}
                      onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Search Available Options</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <p className="text-[11px] text-slate-500 text-center mt-3">
                  Geo-privacy active: exact home addresses are never revealed.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Critical Healthcare & Legal Notice Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <strong className="block text-sm font-bold text-amber-950">
              Healthcare Boundary & Emergency Coordination Protocol
            </strong>
            <p className="leading-relaxed">
              BloodBridge is a voluntary coordination platform, <strong>not a medical authority, hospital, or diagnostic laboratory</strong>. Blood group and geographic proximity matches indicate potential donor candidates only and never constitute clinical confirmation of compatibility. Final cross-matching and transfusion decisions belong exclusively to certified blood bank pathologists. Commercial buying or selling of blood is illegal under Indian law.
            </p>
          </div>
        </div>
      </section>

      {/* 4-Step Emergency Workflow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How BloodBridge Works in an Emergency
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            A fast, structured, four-step journey designed for clarity under pressure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 font-extrabold flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Blood Requirement</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Specify the required blood group, units needed, hospital name, city, and urgency level via direct form or conversational voice/text.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-extrabold flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Patient & Hospital Context</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provide necessary hospital ward details and requester contact information without collecting unnecessary sensitive data upfront.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 font-extrabold flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Instant Verified Results</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              View verified regional blood bank directories alongside consenting donors filtered by 3-month cooldown rules and masked distance bands.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 font-extrabold flex items-center justify-center text-sm">
              4
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Request Coordination</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dispatch WhatsApp alerts to consenting donors, track voluntary responses in real-time, or generate prefilled WhatsApp fallback links.
            </p>
          </div>
        </div>
      </section>

      {/* Verified Blood Banks Discovery Entry Point */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-navy-900 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Verified Directory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Looking for Government & Certified Blood Centres?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Access verified contact numbers, operating hours, and location details for premier medical institutions across Uttar Pradesh (KGMU, SGPGI, IMS-BHU, GSVM, SNMC).
            </p>
          </div>
          <Link
            to="/blood-banks"
            className="px-6 py-3.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-950 flex items-center gap-2 flex-shrink-0"
          >
            <span>Browse UP Blood Banks</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Privacy, Consent & 3-Month Cooldown Safeguards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Privacy-by-Design & Safety Protocols
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            How we protect voluntary donors and ensure transparent coordination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Geo-Privacy Masking</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Exact donor residential addresses and GPS coordinates are never sent in search responses. Requesters only see approximate distance bands (e.g., "Within 2 km").
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">3-Month Cooldown Rule</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In accordance with national donation safety standards, donors who have donated blood within the previous 3 months are automatically paused from emergency request alerts.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Explicit Consent Control</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Donors must opt in explicitly to receive notifications. Donors can toggle availability or withdraw consent at any moment with immediate effect across all search queries.
            </p>
          </div>
        </div>
      </section>

      {/* Credit Points & Donor Recognition (Non-monetary) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase tracking-wide">
                <Award className="w-4 h-4" />
                <span>Participation Ledger</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                BloodBridge Credit Points & Voluntary Recognition
              </h3>
            </div>
            <Link
              to="/donor/dashboard"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
            >
              View Donor Recognition Ledger &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <strong className="block text-slate-900 mb-1">Non-Cash Participation</strong>
              Points acknowledge civic participation such as profile completion, monthly availability confirmation, and community awareness.
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <strong className="block text-slate-900 mb-1">Zero Priority Influence</strong>
              Points strictly never influence emergency patient matching or blood allocation. Emergency matching is based entirely on medical requirement and location.
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <strong className="block text-slate-900 mb-1">Statutory Compliance</strong>
              Points carry zero monetary value, cannot be redeemed for cash, and comply strictly with the National Blood Policy and Drugs & Cosmetics Act.
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Help CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-navy-950 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 border border-navy-800">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Join the Voluntary Lifesaver Network Across Uttar Pradesh
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Whether you are ready to donate blood or want to help family and community members coordinate urgent requirements, BloodBridge provides a secure, reliable foundation.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/donor/registration"
              className="px-6 py-3.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-950"
            >
              Register as a Donor
            </Link>
            <Link
              to="/blood-donation-info"
              className="px-6 py-3.5 text-xs font-bold text-slate-300 bg-navy-800 hover:bg-navy-700 border border-slate-700 rounded-xl transition-all"
            >
              Donation Guidelines (NBTC)
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
