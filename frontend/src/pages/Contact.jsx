import React, { useState } from 'react';
import { Phone, Mail, MapPin, AlertTriangle, Send, CheckCircle2, Clock, Shield } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    district: 'Lucknow',
    category: 'inquiry',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate support ticket intake
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        district: 'Lucknow',
        category: 'inquiry',
        message: ''
      });
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-semibold">
          <Phone className="w-3.5 h-3.5" />
          <span>Help & Emergency Coordination</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Contact BloodBridge & UP Helplines
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Need assistance with platform coordination, blood bank verification, or emergency inquiries? Reach out to our coordination team.
        </p>
      </div>

      {/* Critical Emergency Banner */}
      <div className="bg-red-50 border-l-4 border-red-600 p-5 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide">
            Critical Life-Threatening Emergency Notice
          </h2>
        </div>
        <p className="text-xs text-red-700 leading-relaxed">
          If you or someone in your care is experiencing an acute life-threatening medical emergency, <strong>do not wait for an inquiry response</strong>. Call <strong className="text-red-900 font-bold">108</strong> (Ambulance) or <strong className="text-red-900 font-bold">104</strong> (UP Health & Blood Helpline) immediately, or transfer the patient to the nearest hospital emergency casualty wing without delay.
        </p>
      </div>

      {/* Emergency Helplines Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-center">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mx-auto">
            <Phone className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-rose-600">104</div>
          <h3 className="text-xs font-bold text-slate-900">UP Health & Blood Helpline</h3>
          <p className="text-[11px] text-slate-500">24/7 Government blood coordination and medical consultation</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-center">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold mx-auto">
            <Phone className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-amber-600">108 / 102</div>
          <h3 className="text-xs font-bold text-slate-900">UP Emergency Ambulance</h3>
          <p className="text-[11px] text-slate-500">Toll-free 24/7 dispatch for acute emergencies and hospital transit</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mx-auto">
            <Phone className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-indigo-600">1910</div>
          <h3 className="text-xs font-bold text-slate-900">National Blood Bank Helpline</h3>
          <p className="text-[11px] text-slate-500">NACO / Ministry of Health central blood registry helpline</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mx-auto">
            <Phone className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-emerald-600">112</div>
          <h3 className="text-xs font-bold text-slate-900">UP All-in-One ERSS</h3>
          <p className="text-[11px] text-slate-500">Unified emergency response service across all 75 districts of UP</p>
        </div>
      </div>

      {/* Main Grid: Form & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Information */}
        <div className="lg:col-span-1 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            BloodBridge Coordination Desk
          </h2>

          <div className="space-y-4 text-xs text-slate-600">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">State Operations Hub:</strong>
                Hazratganj, Lucknow, Uttar Pradesh 226001, India
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">Email Support:</strong>
                support@bloodbridge.org<br />
                coordination.up@bloodbridge.org
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">Digital Coordination:</strong>
                Platform active 24/7/365 across Uttar Pradesh
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">Verification Team:</strong>
                Donor registration audits processed within 2-4 hours
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Send an Inquiry or Verification Question
          </h2>

          {submitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold">Message Received</h3>
              <p className="text-xs text-emerald-700">
                Thank you for contacting BloodBridge. Our state coordination desk has logged your request and will follow up shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-3 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Alok Nath"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">District (Uttar Pradesh)</label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="Lucknow">Lucknow</option>
                    <option value="Kanpur">Kanpur Nagar</option>
                    <option value="Varanasi">Varanasi</option>
                    <option value="Prayagraj">Prayagraj</option>
                    <option value="Agra">Agra</option>
                    <option value="Noida">Gautam Buddha Nagar (Noida)</option>
                    <option value="Ghaziabad">Ghaziabad</option>
                    <option value="Bareilly">Bareilly</option>
                    <option value="Gorakhpur">Gorakhpur</option>
                    <option value="Other">Other UP District</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Inquiry Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="inquiry">General Inquiry</option>
                  <option value="donor_verification">Donor Verification Assistance</option>
                  <option value="blood_bank">Hospital / Blood Bank Listing Update</option>
                  <option value="technical">Technical Support / Bug Report</option>
                  <option value="partnership">NGO / Community Partnership</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we assist your blood coordination needs?"
                  className="w-full p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="py-3 px-6 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Submitting...' : 'Send Inquiry'}
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
