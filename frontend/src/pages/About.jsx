import React from 'react';
import { Heart, Shield, Activity, Users, Award, MapPin, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-semibold">
          <Heart className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
          <span>Our Healthcare Mission</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Bridging the Critical Minutes in Emergency Blood Coordination
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          BloodBridge Vision-X is an emergency blood coordination infrastructure engineered to connect patients, voluntary donors, and certified blood centres rapidly, transparently, and safely across Uttar Pradesh.
        </p>
      </div>

      {/* Critical Healthcare Boundary Box */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
            Critical Healthcare & Legal Boundary
          </h2>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>BloodBridge is a coordination platform, not a medical authority or diagnostic service.</strong> Blood group and geographic proximity matching are strictly coordination indicators and never constitute confirmation of clinical compatibility. All cross-matching, testing for transfusion-transmissible infections (TTIs), donor deferral, and final transfusion decisions belong exclusively to authorized medical practitioners and licensed blood centre pathologists.
        </p>
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Privacy-by-Design</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Donor safety is non-negotiable. Exact residential addresses and GPS coordinates are never made public. Only approximate distance bands (e.g., "Within 2 km") are displayed to protect voluntary donors.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">PostGIS Spatial Accuracy</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Using database-level PostGIS SRID 4326 geography indexing, queries calculate spherical distance in milliseconds without loading unmasked donor datasets into client browsers.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Standardized Protocols</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Our donor eligibility guidelines align strictly with the National Blood Transfusion Council (NBTC), Directorate General of Health Services (DGHS), and WHO transfusion safety guidelines.
          </p>
        </div>
      </div>

      {/* Uttar Pradesh Launch Focus */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5" />
              <span>Phase 1 Deployment: Uttar Pradesh</span>
            </div>
            <h2 className="text-2xl font-bold">Serving 75 Districts Across the State</h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              With a population exceeding 240 million, rapid blood access in Uttar Pradesh requires resilient digital coordination between premier tertiary medical centres (SGPGI, KGMU, IMS-BHU), district hospitals, and grassroots voluntary donor clubs.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/donors/nearby"
              className="px-5 py-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow transition-all text-center"
            >
              Search UP Donors
            </Link>
            <Link
              to="/blood-banks"
              className="px-5 py-3 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-center"
            >
              View UP Blood Banks
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-700/80 text-center">
          <div>
            <div className="text-2xl font-black text-rose-400">75</div>
            <div className="text-[11px] text-slate-400">UP Districts Supported</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">&lt; 50ms</div>
            <div className="text-[11px] text-slate-400">Spatial Matching Latency</div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400">100%</div>
            <div className="text-[11px] text-slate-400">Consent-Gated Contact</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">24 / 7</div>
            <div className="text-[11px] text-slate-400">Emergency Accessibility</div>
          </div>
        </div>
      </div>

      {/* Governance & Compliance */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Governance & Verification Workflow</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Every voluntary donor registered through Google Forms or our web application undergoes verification before appearing as an active donor candidate. Admin operators audit contact details, verification documents, and consent status. Donors retain the absolute right to toggle availability or withdraw contact consent instantly at any time.
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          <Link
            to="/privacy-policy"
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            Read our Privacy Policy <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/terms"
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            Terms of Use & Clinical Boundaries <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
