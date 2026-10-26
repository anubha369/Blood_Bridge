import React from 'react';
import { Shield, Sparkles, MapPin, Database, CheckCircle2, AlertTriangle, ArrowRight, FileText, Layers, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HowItWorks() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
          Architecture & Verification Guide
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          How BloodBridge Vision-X Coordinates Emergencies
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          BloodBridge replaces chaotic social media requests and manual phone calling with a deterministic, privacy-first coordination platform.
        </p>
      </div>

      {/* 4-Step User Journey */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-rose-600" />
          The End-to-End Coordination Workflow
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center text-sm">
                1
              </span>
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
                Groq AI Parsing
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base">Request Formulation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Users describe what they need in natural language or a structured form (e.g. <em>"Need 2 units of B+ near Ghaziabad tomorrow"</em>). Groq LLM parses the blood group, units, location, and urgency into structured JSON without hallucinating medical facts.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                2
              </span>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                PostGIS GiST
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base">Spatial Database Filtering</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The backend queries the PostGIS database using <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">ST_DWithin</code> and <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">ST_Distance</code> on SRID 4326 geography points. PostGIS uses GiST spatial indexes to evaluate nearby points in under 15ms.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                3
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Privacy Enforcement
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base">Consent & Geo-Privacy Masking</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Donors who withdraw consent or mark themselves unavailable are automatically excluded. For consenting donors, exact coordinates and home addresses are never sent to the client; only approximate bands like <strong>"Within 2 km"</strong> are returned.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center text-sm">
                4
              </span>
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                Clinical Boundary
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base">Hospital Clinical Validation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When a potential donor is located, they report to the hospital or blood bank. Certified blood bank pathologists perform ABO cross-matching, antibody screening, and hemoglobin validation before any transfusion takes place.
            </p>
          </div>
        </div>
      </div>

      {/* Google Forms Integration Breakdown */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Google Forms & Sheets Pipeline</h2>
            <p className="text-xs text-slate-500">How external donor drive submissions reach the database securely</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-700">1. Google Form</span>
            <p className="text-slate-600">Donor submits name, blood group, city, phone, and contact consent.</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-700">2. Google Sheet</span>
            <p className="text-slate-600">Row is inserted and triggers Google Apps Script onFormSubmit event.</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-700">3. Apps Script Webhook</span>
            <p className="text-slate-600">Sends HTTP POST to backend with <code className="bg-slate-200 px-1 py-0.5 rounded">x-webhook-secret</code> header.</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-700">4. Pending Verification</span>
            <p className="text-slate-600">Backend validates payload, geocodes city, and inserts with <em>pending_verification</em> status.</p>
          </div>
        </div>
      </div>

      {/* RAG Knowledge Architecture */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Retrieval-Augmented Generation (RAG) Pipeline</h2>
            <p className="text-xs text-slate-500">Grounded medical assistance without hallucinations</p>
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
          <p>
            Unlike generic AI chatbots that hallucinate medical facts, BloodBridge implements a strict <strong>RAG pipeline</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong>Admin Ingestion Gate:</strong> Only documents reviewed and given <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-semibold">status = 'approved'</code> by administrators can be retrieved.</li>
            <li><strong>Text Chunking:</strong> Long documents from NBTC, WHO, and DGHS are chunked into overlapping segments.</li>
            <li><strong>Vector Retrieval:</strong> User queries are vectorized and matched using cosine similarity against approved chunks.</li>
            <li><strong>Citations & Fallback:</strong> If approved documents do not contain the answer, the AI clearly states so and cites its sources.</li>
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-6">
        <Link
          to="/donors/nearby"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all shadow-rose-200"
        >
          Try Nearby Donor Search Now
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
