import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Activity, MapPin, Heart, Clock, Shield, CheckCircle2, Phone, AlertCircle, Building2, User, ChevronRight, MessageSquare } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RequestDetails() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [radiusKm, setRadiusKm] = useState(30);
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [selectedDonorForContact, setSelectedDonorForContact] = useState(null);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.requests.getById(id);
      if (res.success && res.request) {
        setRequest(res.request);
      } else {
        setError('Request not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch blood request.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (radius = radiusKm) => {
    try {
      setCandidatesLoading(true);
      const res = await api.requests.getCandidates(id, radius);
      if (res.success) {
        setCandidates(res.candidates || []);
      }
    } catch (err) {
      console.error('Candidate fetch error:', err);
    } finally {
      setCandidatesLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRequest();
      fetchCandidates();
    }
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      setStatusUpdating(true);
      const res = await api.requests.updateStatus(id, newStatus);
      if (res.success && res.request) {
        setRequest(res.request);
      }
    } catch (err) {
      alert(err.message || 'Failed to update request status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleOpenWhatsAppForDonor = (donor) => {
    if (!donor || !donor.phone) {
      alert('Donor contact phone number is missing or protected.');
      return;
    }
    const cleanDigits = String(donor.phone).replace(/[^0-9]/g, '');
    if (cleanDigits.length < 10) {
      alert('A valid phone number (minimum 10 digits) is required to open WhatsApp.');
      return;
    }
    const normalizedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const emergencyMsg = 
      `*BloodBridge Emergency Blood Coordination*\n\n` +
      `Hello ${donor.name},\n` +
      `We urgently need ${request?.units_needed || 1} unit(s) of ${request?.blood_group || donor.blood_group} blood for patient ${request?.patient_name || 'an emergency patient'} at ${request?.hospital_name || 'hospital'}, ${request?.city || donor.city}.\n\n` +
      `You are registered as a willing donor in ${donor.city}.\n` +
      `Please let us know if you are available to donate or call us at: ${request?.contact_phone || '+91 98765 00000'}.\n\n` +
      `_This coordination request is sent via BloodBridge Vision-X._`;

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(emergencyMsg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-xs text-slate-500">
        <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading request details...
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Request Not Found</h2>
        <p className="text-xs text-slate-600">{error || 'The requested blood requirement could not be located.'}</p>
        <Link to="/requester/dashboard" className="inline-block px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isOwner = user && (user.id === request.requester_id || isAdmin);

  // Status journey stages
  const stages = [
    { key: 'created', label: '1. Registered' },
    { key: 'active', label: '2. Active Search' },
    { key: 'matched', label: '3. Candidates Found' },
    { key: 'fulfilled', label: '4. Fulfilled' }
  ];

  let currentStageIndex = 0;
  if (request.status === 'active') {
    currentStageIndex = candidates.length > 0 ? 2 : 1;
  } else if (request.status === 'fulfilled') {
    currentStageIndex = 3;
  } else if (request.status === 'cancelled') {
    currentStageIndex = -1;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-900">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/requester/dashboard" className="hover:text-slate-900">Requests</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-slate-800">{request.patient_name} ({request.blood_group})</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-rose-600 text-white font-extrabold text-sm rounded-xl">
              {request.blood_group}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              request.urgency === 'emergency'
                ? 'bg-red-100 text-red-800 animate-pulse'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {request.urgency}
            </span>
            <span className="text-xs text-slate-400">
              ID: <span className="font-mono text-slate-600">{request.id.slice(0, 8)}</span>
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Blood Requirement for {request.patient_name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {request.hospital_name}, {request.city}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Needed: {request.units_needed} units
            </span>
          </div>
        </div>

        {/* Status controls */}
        {isOwner && (
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5 min-w-[200px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Manage Request Status
            </span>
            <div className="flex gap-2">
              {request.status !== 'fulfilled' && (
                <button
                  onClick={() => handleStatusChange('fulfilled')}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all"
                >
                  Mark Fulfilled
                </button>
              )}
              {request.status === 'active' && (
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Cancel
                </button>
              )}
              {request.status !== 'active' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all"
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress Journey Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Request Coordination Journey
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {stages.map((stg, idx) => {
            const isDone = currentStageIndex >= idx;
            const isCurrent = currentStageIndex === idx;
            return (
              <div
                key={stg.key}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm ring-2 ring-rose-500/20'
                    : isDone
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {stg.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Matched Donors & Hospital Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Matched Donors */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-600" />
                  Matched Candidate Donors ({candidates.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Sorted deterministically by ABO/Rh compatibility, proximity band, and verification status.
                </p>
              </div>

              {/* Radius filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Radius:</span>
                <select
                  value={radiusKm}
                  onChange={(e) => {
                    const r = parseInt(e.target.value, 10);
                    setRadiusKm(r);
                    fetchCandidates(r);
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-rose-600 text-xs"
                >
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={30}>30 km</option>
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                </select>
              </div>
            </div>

            {/* Candidate list */}
            {candidatesLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Matching available donors...
              </div>
            ) : candidates.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-3">
                <p>No available voluntary donors matching ABO/Rh criteria within {radiusKm} km.</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setRadiusKm(50);
                      fetchCandidates(50);
                    }}
                    className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl"
                  >
                    Expand Radius to 50 km
                  </button>
                  <Link
                    to="/blood-banks"
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-800 rounded-xl"
                  >
                    View Blood Banks
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((cand, idx) => (
                  <div
                    key={cand.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center text-xs">
                          {cand.blood_group}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{cand.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>{cand.city} ({cand.area || 'General Area'})</span>
                            <span>•</span>
                            <span className="font-semibold text-rose-600">{cand.distance_band}</span>
                          </div>
                        </div>
                      </div>

                      {/* Matching reasons */}
                      {cand.match_reasons && cand.match_reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {cand.match_reasons.map((r, rIdx) => (
                            <span key={rIdx} className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDonorForContact(cand)}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Contact Donor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Details Summary & Helplines */}
        <div className="space-y-6">
          {/* Request Info Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Request Details
            </h3>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex justify-between">
                <span className="text-slate-400">Patient:</span>
                <span className="font-semibold text-slate-900">{request.patient_name}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Hospital:</span>
                <span className="font-semibold text-slate-900 text-right">{request.hospital_name}</span>
              </li>
              {request.hospital_address && (
                <li className="flex justify-between">
                  <span className="text-slate-400">Address:</span>
                  <span className="text-slate-700 text-right">{request.hospital_address}</span>
                </li>
              )}
              <li className="flex justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="font-semibold text-slate-900">{request.city}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Contact Phone:</span>
                <span className="font-semibold text-slate-900">{request.contact_phone || 'Protected'}</span>
              </li>
              {request.description && (
                <li className="pt-2 border-t border-slate-100 text-slate-600 leading-relaxed">
                  <strong className="block text-slate-800 mb-1">Requester Notes:</strong>
                  {request.description}
                </li>
              )}
            </ul>
          </div>

          {/* Regional Blood Bank Referral */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-400">
              <Building2 className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Need Blood Immediately?
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Contact 24/7 certified hospital blood centres in {request.city} or call Uttar Pradesh state helpline <strong className="text-white">104</strong>.
            </p>
            <Link
              to="/blood-banks"
              className="inline-block text-xs font-bold text-rose-400 hover:text-rose-300 underline"
            >
              Browse verified blood centres &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Contact Donor Modal */}
      {selectedDonorForContact && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                  Consent-Gated Contact
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Contact {selectedDonorForContact.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDonorForContact(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Blood Group:</span>
                <span className="font-bold text-rose-600">{selectedDonorForContact.blood_group}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Proximity:</span>
                <span className="font-medium text-slate-800">{selectedDonorForContact.distance_band}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono font-bold text-slate-900">{selectedDonorForContact.phone || '+91 98765 00000'}</span>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              <strong>Coordination etiquette:</strong> Please introduce yourself politely, state patient details and hospital name, and verify the donor's current wellness before scheduling travel.
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleOpenWhatsAppForDonor(selectedDonorForContact)}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-center text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open WhatsApp to Send Request</span>
              </button>
              <a
                href={`tel:${selectedDonorForContact.phone}`}
                className="py-2.5 px-4 text-xs font-bold text-center text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200"
              >
                Call
              </a>
              <button
                type="button"
                onClick={() => setSelectedDonorForContact(null)}
                className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-normal">
              Notice: Click-to-chat opens your WhatsApp app with a prefilled request. You must tap &quot;Send&quot; inside WhatsApp to dispatch the message.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
