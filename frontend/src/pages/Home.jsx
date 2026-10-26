import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, Shield, Activity, Sparkles, Building2, ArrowRight, CheckCircle2, Clock, MapPin, Users } from 'lucide-react';

export default function Home({ onOpenAI }) {
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [city, setCity] = useState('Jaipur');
  const [radius, setRadius] = useState(25);
  const navigate = useNavigate();

  const handleQuickSearch = (e) => {
    e.preventDefault();
    navigate(`/donors/nearby?city=${encodeURIComponent(city)}&blood_group=${encodeURIComponent(bloodGroup)}&radius_km=${radius}`);
  };

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-50/60 via-white to-slate-50 pt-12 pb-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Heading & Pitch */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold tracking-wide uppercase">
                <Activity className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                Emergency Blood Coordination • Vision-X
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                In an emergency, <br />
                <span className="bg-gradient-to-r from-rose-600 to-red-500 bg-clip-text text-transparent">
                  don't search harder.
                </span><br />
                Find verified options faster.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                BloodBridge Vision-X connects urgent blood requirements with verified donors and licensed blood banks using PostGIS spatial indexing, Groq LLM request extraction, and approved medical RAG guidance.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/requests/create"
                  className="px-6 py-3.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-200 hover:shadow-xl transition-all flex items-center gap-2 group"
                >
                  Create Blood Request
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <button
                  onClick={onOpenAI}
                  className="px-5 py-3.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  Ask AI Coordinator
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  SRID 4326 PostGIS Spatial Index
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  Strict Geo-Privacy (No Raw Coordinates)
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Consent-Governed Contact
                </span>
              </div>
            </div>

            {/* Right Column: Instant Search Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 relative">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-rose-600" />
                    <h3 className="font-bold text-slate-900 text-base">Quick Proximity Search</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    PostGIS ST_DWithin
                  </span>
                </div>

                <form onSubmit={handleQuickSearch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Required Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City or Approximate Location</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      <option value="Jaipur">Jaipur (Rajasthan)</option>
                      <option value="Ghaziabad">Ghaziabad (Uttar Pradesh)</option>
                      <option value="Delhi">New Delhi (NCR)</option>
                      <option value="Noida">Noida (Uttar Pradesh)</option>
                      <option value="Bengaluru">Bengaluru (Karnataka)</option>
                      <option value="Mumbai">Mumbai (Maharashtra)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Search Radius</span>
                      <span className="text-rose-600">{radius} km</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={radius}
                      onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Locate Potential Donors
                  </button>
                </form>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Privacy protected: only approximate distance bands (e.g. "Within 5 km") are revealed. Home coordinates remain private.
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="text-3xl font-extrabold text-slate-900 mb-1">100%</div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600">Consent Governed</div>
            <p className="text-[11px] text-slate-500 mt-1">Zero unconsented donor outreach</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="text-3xl font-extrabold text-slate-900 mb-1">&lt; 50ms</div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600">PostGIS GiST Queries</div>
            <p className="text-[11px] text-slate-500 mt-1">Sub-second spatial indexing</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="text-3xl font-extrabold text-slate-900 mb-1">Groq LLM</div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600">Natural Language</div>
            <p className="text-[11px] text-slate-500 mt-1">Parses speech & raw requests</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="text-3xl font-extrabold text-slate-900 mb-1">RAG Pipeline</div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600">Approved Knowledge</div>
            <p className="text-[11px] text-slate-500 mt-1">NBTC & DGHS medical guidance</p>
          </div>
        </div>
      </section>

      {/* Core Workflow Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Engineered for High-Pressure Coordination
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Every layer of BloodBridge Vision-X is built with deterministic safeguards, strict privacy, and clinical boundary awareness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">PostGIS Spatial Geo-Indexing</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Database-side geographic point calculation via <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded">ST_DWithin</code> and GiST spatial indexes. Never loads the entire table into client JavaScript.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Groq Natural Language AI</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Extracts patient blood group, units, hospital, and urgency from freeform emergency text without ever using an LLM to hallucinate medical compatibility.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Privacy-Safe Matching</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Coordinates donors using fuzzy distance bands ("Within 2 km"). Donors who withdraw consent are immediately excluded from search results.
            </p>
          </div>
        </div>
      </section>

      {/* Verified Blood Banks Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-800">
              24/7 Regional Centres
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Looking for Verified Hospital Blood Banks?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Access official phone numbers, addresses, and latest reported inventory summaries across NABH accredited hospitals and Red Cross centres.
            </p>
          </div>
          <Link
            to="/blood-banks"
            className="px-6 py-3.5 text-sm font-bold text-slate-950 bg-white hover:bg-slate-100 rounded-xl shadow-md transition-all whitespace-nowrap flex items-center gap-2"
          >
            <Building2 className="w-4 h-4 text-rose-600" />
            Explore Blood Banks Directory
          </Link>
        </div>
      </section>
    </div>
  );
}
