import React from 'react';
import { Shield, AlertTriangle, FileText, Ban, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfUse() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-semibold">
          <FileText className="w-3.5 h-3.5" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          BloodBridge Terms of Use & Clinical Boundaries
        </h1>
        <p className="text-xs text-slate-500">
          Effective date: October 2026 • Applicable across all BloodBridge Vision-X web and mobile services
        </p>
      </div>

      {/* Critical Healthcare & Legal Notice */}
      <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-3xl space-y-3">
        <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>CRITICAL HEALTHCARE BOUNDARY & CLINICAL DISCLAIMER</span>
        </div>
        <p className="text-xs text-red-800 leading-relaxed">
          <strong>BloodBridge is a voluntary coordination platform, NOT a medical provider, diagnostic laboratory, or blood bank.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-red-800 leading-relaxed">
          <li>Blood group matches and location proximity displayed by BloodBridge are informational coordination indicators only. <strong>They do NOT confirm clinical compatibility or transfusion safety.</strong></li>
          <li>All cross-matching, Transfusion-Transmissible Infection (TTI) testing, donor physical assessment, and final blood release decisions belong exclusively to certified pathologists, licensed blood centres, and attending hospital clinicians.</li>
          <li>BloodBridge does not guarantee blood availability at any listed hospital or donor location.</li>
        </ul>
      </div>

      {/* Prohibition on Commercial Sale of Blood */}
      <div className="bg-amber-50 border border-amber-300 p-5 rounded-2xl flex items-start gap-3">
        <Ban className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <strong className="block text-sm font-bold">Strict Prohibition of Paid Blood Donation (Indian Law)</strong>
          <p>
            Under Section 27 of the Drugs and Cosmetics Act (1940) and Supreme Court of India rulings (Common Cause vs. Union of India, 1996), <strong>commercial buying or selling of blood, platelets, or plasma is strictly prohibited and illegal</strong>. BloodBridge operates exclusively for voluntary, altruistic, unpaid blood donation. Any user attempting to solicit payment, trade blood, or charge coordination fees will be permanently banned and reported to law enforcement.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing, creating an account, registering as a donor, or submitting an emergency blood request on BloodBridge Vision-X, you agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree with any provision, you must not use the platform.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Emergency Operations & No Warranty</h2>
          <p>
            While BloodBridge is built with high-availability systems, real-time spatial indexing, and resilient architecture:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>The service is provided on an "as-is" and "as-available" basis without warranties of any kind.</li>
            <li>In catastrophic or acute life-threatening situations, users must not rely solely on software messages and must concurrently engage official hospital blood banks and ambulance services (dial 108 or 104 in UP).</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. User Responsibilities & Conduct</h2>
          <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600">
            <li><strong>Requesters:</strong> Must submit genuine medical requirements and provide accurate hospital details. Fabricated or test requests in production environments are strictly forbidden.</li>
            <li><strong>Donors:</strong> Must accurately declare their known blood group and medical readiness. Donors who are feeling unwell, have recently started antibiotics, or meet deferral criteria must update their availability status.</li>
            <li><strong>Respect for Volunteers:</strong> Requesters must communicate with voluntary donors respectfully and during reasonable coordination hours, understanding that donors give their time altruistically.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Geographic Privacy Safeguards</h2>
          <p>
            Users agree not to attempt reverse-engineering, scraping, or de-anonymizing donor coordinates or contact numbers. Automated crawling or unauthorized extraction of blood bank data is prohibited.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, BloodBridge Foundation, its developers, and contributors shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages resulting from:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>Delay or inability of any voluntary donor to attend or donate.</li>
            <li>Clinical incompatibility, adverse transfusion reactions, or hospital stock shortages.</li>
            <li>Telecommunication delays, network failures, or unreceived SMS/webhook notifications.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">6. Governing Law & Jurisdiction</h2>
          <p>
            These Terms of Use shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising in connection with the platform shall be subject to the exclusive jurisdiction of the competent courts in Lucknow, Uttar Pradesh.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
        <Link to="/privacy-policy" className="text-rose-600 hover:text-rose-700 underline font-semibold">
          &larr; View Privacy Policy
        </Link>
        <Link to="/" className="text-slate-600 hover:text-slate-900">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
