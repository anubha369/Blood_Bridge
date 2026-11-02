import React from 'react';
import { Heart, Phone, Shield, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 mt-20" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand & Emergency Helplines */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white">
                <Heart className="w-5 h-5 fill-white" />
              </div>
              <span className="text-2xl font-black text-white tracking-tight">BloodBridge</span>
            </Link>
            <p className="text-[16px] text-slate-400 leading-relaxed font-normal">
              Emergency blood discovery and coordination network built for rapid golden-hour response across Uttar Pradesh.
            </p>
            <div className="text-[15px] text-slate-300 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-1">
              <span className="font-bold text-rose-400 block mb-1">UP Emergency Helplines:</span>
              <div>Blood Availability: <strong className="text-white font-bold">1910</strong></div>
              <div>State Health Helpline: <strong className="text-white font-bold">104</strong></div>
              <div>Emergency Ambulance: <strong className="text-white font-bold">108 / 102</strong></div>
            </div>
          </div>

          {/* Coordination & Help */}
          <div className="space-y-3">
            <h4 className="text-[18px] font-bold text-white uppercase tracking-wider">
              Coordination &amp; Help
            </h4>
            <ul className="space-y-2.5 text-[16px] sm:text-[17px]">
              <li><Link to="/requests/create" className="hover:text-rose-400 transition-colors">Create Blood Request</Link></li>
              <li><Link to="/blood-banks" className="hover:text-rose-400 transition-colors">Verified Blood Banks</Link></li>
              <li><Link to="/donor/registration" className="hover:text-rose-400 transition-colors">Register as a Donor</Link></li>
              <li><Link to="/blood-donation-info" className="hover:text-rose-400 transition-colors">Blood Donation Guide</Link></li>
              <li><Link to="/how-it-works" className="hover:text-rose-400 transition-colors">How BloodBridge Works</Link></li>
            </ul>
          </div>

          {/* About & Portals */}
          <div className="space-y-3">
            <h4 className="text-[18px] font-bold text-white uppercase tracking-wider">
              Platform &amp; Portals
            </h4>
            <ul className="space-y-2.5 text-[16px] sm:text-[17px]">
              <li><Link to="/about" className="hover:text-rose-400 transition-colors">About BloodBridge</Link></li>
              <li><Link to="/contact" className="hover:text-rose-400 transition-colors">Contact &amp; UP Helplines</Link></li>
              <li><Link to="/requester/dashboard" className="hover:text-rose-400 transition-colors">Requester Portal</Link></li>
              <li><Link to="/donor/dashboard" className="hover:text-rose-400 transition-colors">Donor Portal</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-rose-400 transition-colors">Admin Verification</Link></li>
              <li><Link to="/login" className="hover:text-rose-400 transition-colors">Sign In</Link></li>
            </ul>
          </div>

          {/* Clinical & Privacy Notice */}
          <div className="space-y-3">
            <h4 className="text-[18px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-500" />
              <span>Privacy &amp; Legal</span>
            </h4>
            <p className="text-[15px] sm:text-[16px] text-slate-400 leading-relaxed font-normal">
              BloodBridge coordinates; authorized medical professionals decide. We never expose raw donor coordinates or private addresses.
            </p>
            <div className="space-y-1.5 text-[15px] sm:text-[16px] pt-1">
              <div><Link to="/privacy-policy" className="text-slate-400 hover:text-white underline">Privacy Policy (Geo-Masking)</Link></div>
              <div><Link to="/terms" className="text-slate-400 hover:text-white underline">Terms of Use &amp; Clinical Boundary</Link></div>
            </div>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 text-[15px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 BloodBridge. Built for rapid emergency coordination across Uttar Pradesh.</p>
          <p className="text-slate-400 text-[14px]">
            Strictly Voluntary &amp; Altruistic • Compliant with Section 27 Drugs &amp; Cosmetics Act
          </p>
        </div>
      </div>
    </footer>
  );
}
