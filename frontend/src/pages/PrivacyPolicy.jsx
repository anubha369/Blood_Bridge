import React from 'react';
import { Shield, Lock, EyeOff, CheckCircle2, UserCheck, Trash2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>Privacy & Data Protection</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          BloodBridge Privacy Policy
        </h1>
        <p className="text-xs text-slate-500">
          Last updated: October 2026 • Compliant with the Digital Personal Data Protection (DPDP) Act, 2023 of India
        </p>
      </div>

      {/* Core Privacy Summary Banner */}
      <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-3xl space-y-3">
        <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-600" />
          Our Privacy Principles in Brief
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-indigo-900">
          <div className="bg-white/80 p-3.5 rounded-xl border border-indigo-100">
            <strong className="block text-indigo-950 mb-1">Zero Coordinate Exposure</strong>
            Exact home GPS coordinates and street addresses are never revealed in search results.
          </div>
          <div className="bg-white/80 p-3.5 rounded-xl border border-indigo-100">
            <strong className="block text-indigo-950 mb-1">Consent-Gated Matching</strong>
            Donors only appear in searches when they have explicitly consented to emergency contact.
          </div>
          <div className="bg-white/80 p-3.5 rounded-xl border border-indigo-100">
            <strong className="block text-indigo-950 mb-1">Instant Withdrawal</strong>
            Donors can withdraw consent or delete their profile anytime with immediate effect.
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs flex items-center justify-center font-bold">1</span>
            Information We Collect
          </h2>
          <p>
            BloodBridge collects only the minimum necessary information to facilitate emergency blood coordination:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>Donor Information:</strong> Name, reported ABO/Rh blood group, city/district, general locality or postal code, approximate latitude/longitude (for distance calculation only), contact telephone number, and consent status.</li>
            <li><strong>Requester Information:</strong> Requester name, patient name, required blood group, units needed, hospital name, hospital city, urgency level, and contact phone number.</li>
            <li><strong>Authentication Data:</strong> Email address and salted, securely hashed passwords (using bcrypt with cost factor 10). Plaintext passwords are never stored or logged.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs flex items-center justify-center font-bold">2</span>
            Geographic Privacy & Spatial Masking
          </h2>
          <p>
            To prevent stalking, harassment, or unauthorized profiling of voluntary lifesavers, BloodBridge employs automated database-level geographic masking:
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <EyeOff className="w-4 h-4 text-rose-500" />
              Masked Distance Bands Implementation:
            </div>
            <p className="text-slate-600">
              Rather than revealing donor coordinates, the API transforms spatial distances into privacy-preserving bands:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-center">
              <div className="bg-white p-2 rounded border border-slate-200">&le; 2 km &rarr; "Within 2 km"</div>
              <div className="bg-white p-2 rounded border border-slate-200">&le; 5 km &rarr; "Within 5 km"</div>
              <div className="bg-white p-2 rounded border border-slate-200">&le; 10 km &rarr; "Within 10 km"</div>
              <div className="bg-white p-2 rounded border border-slate-200">&gt; 10 km &rarr; "Within X km"</div>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs flex items-center justify-center font-bold">3</span>
            Consent & Withdrawal Rights
          </h2>
          <p>
            Consent is the cornerstone of BloodBridge operations:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>Explicit Opt-In:</strong> Donors register voluntarily through our verified Google Form or web portal and expressly check a consent agreement before their listing can be searched.</li>
            <li><strong>Immediate Revocation:</strong> Donors can withdraw consent at any time via their Donor Portal. Revocation takes effect instantly, purging the donor from all active spatial queries.</li>
            <li><strong>Availability Toggling:</strong> Donors traveling, recovering, or temporarily unable to donate can toggle their status to "Unavailable" without deleting their account.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs flex items-center justify-center font-bold">4</span>
            Data Sharing & Third Parties
          </h2>
          <p>
            <strong>BloodBridge never sells, monetizes, or shares personal user information with commercial third parties, marketers, or data brokers.</strong>
          </p>
          <p className="text-xs text-slate-600">
            Donor contact details are made available exclusively to registered requesters with active emergency blood requests who are coordinating immediate life-saving donation. All inquiries and access are audited in system audit logs.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs flex items-center justify-center font-bold">5</span>
            Data Retention & Deletion
          </h2>
          <p>
            Users can permanently delete their account and associated donor profile by submitting an account removal request or emailing <a href="mailto:privacy@bloodbridge.org" className="text-rose-600 underline">privacy@bloodbridge.org</a>. Upon receipt, all identifying personal information is permanently expunged within 48 hours.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs flex items-center justify-center font-bold">6</span>
            Contact Our Data Protection Officer
          </h2>
          <p>
            For privacy inquiries, audit log requests, or DPDP compliance queries regarding BloodBridge operations across Uttar Pradesh:
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
            <div><strong>Data Privacy Officer:</strong> BloodBridge Foundation</div>
            <div><strong>Email:</strong> privacy@bloodbridge.org</div>
            <div><strong>Jurisdiction:</strong> Lucknow, Uttar Pradesh, India</div>
          </div>
        </section>
      </div>

      <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
        <Link to="/terms" className="text-rose-600 hover:text-rose-700 underline font-semibold">
          View Terms of Use & Clinical Boundaries &rarr;
        </Link>
        <Link to="/" className="text-slate-600 hover:text-slate-900">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
