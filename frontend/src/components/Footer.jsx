import React from 'react';
import { Heart, Phone, Shield, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                <Heart className="w-4 h-4 fill-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">BloodBridge</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-900/60 text-rose-300 px-1.5 py-0.5 rounded">
                Vision-X
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time emergency blood coordination powered by PostGIS spatial indexing, Groq LLM, and approved medical RAG retrieval.
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
              <span className="font-semibold text-rose-400 block mb-0.5">Emergency Helplines (India):</span>
              National Blood Bank: <strong className="text-white">104 / 1910</strong><br />
              National Ambulance: <strong className="text-white">108 / 102</strong>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Coordination</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/donors/nearby" className="hover:text-white transition-colors">Find Nearby Donors</Link></li>
              <li><Link to="/blood-banks" className="hover:text-white transition-colors">Verified Blood Banks</Link></li>
              <li><Link to="/requests/create" className="hover:text-white transition-colors">Create Blood Request</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">Platform Architecture</Link></li>
            </ul>
          </div>

          {/* Roles */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">User Portals</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/requester/dashboard" className="hover:text-white transition-colors">Requester Portal</Link></li>
              <li><Link to="/donor/dashboard" className="hover:text-white transition-colors">Donor Portal</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-white transition-colors">Admin Verification</Link></li>
              <li><Link to="/admin/rag" className="hover:text-white transition-colors">Approved RAG Docs</Link></li>
            </ul>
          </div>

          {/* Clinical & Privacy Notice */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-rose-500" />
              Privacy & Clinical Boundaries
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              BloodBridge coordinates; authorized medical professionals decide. We never expose raw donor coordinates or private addresses.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Final transfusion compatibility, testing, and blood release belong strictly to certified blood bank pathologists and attending clinicians.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 BloodBridge Vision-X. Built for rapid emergency coordination.</p>
          <p className="text-slate-400 text-[11px]">
            SRID 4326 PostGIS GiST Indexing • Groq LLM Inference • pgvector / TF-IDF Vector RAG
          </p>
        </div>
      </div>
    </footer>
  );
}
