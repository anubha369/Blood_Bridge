import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  MapPin,
  Heart,
  Clock,
  Shield,
  CheckCircle2,
  Phone,
  AlertCircle,
  Building2,
  User,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  UserCheck,
  Send,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RequestDetails() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [acceptedDonors, setAcceptedDonors] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [radiusKm, setRadiusKm] = useState(30);
  const [loading, setLoading] = useState(true);
  const [acceptedLoading, setAcceptedLoading] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [selectingDonorId, setSelectingDonorId] = useState(null);
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

  const fetchAcceptedDonors = async () => {
    try {
      setAcceptedLoading(true);
      const res = await api.requests.getAcceptedDonors(id);
      if (res.success) {
        setAcceptedDonors(res.donors || []);
      }
    } catch (err) {
      // Non-fatal if unauthorized or no notifications yet
      console.warn('Accepted donors fetch notice:', err.message);
    } finally {
      setAcceptedLoading(false);
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
      fetchAcceptedDonors();
      fetchCandidates();
    }
  }, [id]);

  const handleSelectDonor = async (donorId) => {
    setSelectingDonorId(donorId);
    try {
      const res = await api.requests.selectDonor(id, donorId);
      if (res.success) {
        setRequest(res.request);
        await fetchAcceptedDonors();
        alert(res.message);
      } else {
        alert(res.error || 'Failed to select donor.');
      }
    } catch (err) {
      alert(`Selection error: ${err.message}`);
    } finally {
      setSelectingDonorId(null);
    }
  };

  const handleReselectDonor = async () => {
    if (!window.confirm('Are you sure you want to change the selected donor? You will be able to select another accepting donor.')) return;
    try {
      const res = await api.requests.reselectDonor(id);
      if (res.success) {
        setRequest(res.request);
        await fetchAcceptedDonors();
      }
    } catch (err) {
      alert(`Reselection error: ${err.message}`);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setStatusUpdating(true);
      const res = await api.requests.updateStatus(id, newStatus);
      if (res.success && res.request) {
        setRequest(res.request);
        await fetchAcceptedDonors();
      }
    } catch (err) {
      alert(err.message || 'Failed to update request status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleOpenWhatsAppForDonor = (donor) => {
    if (!donor || !donor.phone) {
      alert('Donor contact phone number is missing or protected. You must select this donor first.');
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
      `You accepted our coordination request on BloodBridge.\n` +
      `Please let us know your current availability or call us directly at: ${request?.contact_phone || '+91 98765 00000'}.\n\n` +
      `_This coordination request is sent via BloodBridge Vision-X._`;

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(emergencyMsg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-xs text-slate-500">
        <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading request details and verified donor responses...
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
    { key: 'submitted', label: '1. Registered' },
    { key: 'notifications_queued', label: '2. Alerting Donors' },
    { key: 'responses_received', label: '3. Donors Responded' },
    { key: 'donor_selected', label: '4. Donor Selected' },
    { key: 'fulfilled', label: '5. Fulfilled' }
  ];

  let currentStageIndex = 0;
  if (request.status === 'submitted' || request.status === 'searching') currentStageIndex = 0;
  else if (request.status === 'notifications_queued') currentStageIndex = 1;
  else if (request.status === 'responses_received') currentStageIndex = 2;
  else if (request.status === 'donor_selected') currentStageIndex = 3;
  else if (request.status === 'fulfilled') currentStageIndex = 4;
  else if (request.status === 'cancelled') currentStageIndex = -1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/requester/dashboard" className="hover:text-rose-600">Requester Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="font-mono text-slate-700">Req #{request.id.substring(0, 8)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-rose-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
              {request.blood_group}
            </span>
            <span>Blood Requirement for {request.patient_name}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {request.units_needed} units required at <strong className="text-slate-700">{request.hospital_name}</strong>, {request.city}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchRequest();
              fetchAcceptedDonors();
            }}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm"
            title="Refresh Live Responses"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isOwner && request.status !== 'fulfilled' && request.status !== 'cancelled' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStatusChange('fulfilled')}
                disabled={statusUpdating}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all"
              >
                Mark Fulfilled
              </button>
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={statusUpdating}
                className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200"
              >
                Cancel Request
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Journey Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Lifecycle Coordination Progress
          </h3>
          <span className="text-xs font-bold text-rose-600 uppercase bg-rose-50 px-2.5 py-0.5 rounded-full">
            Status: {request.status}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          {stages.map((stg, idx) => {
            const isDone = currentStageIndex >= idx;
            const isCurrent = currentStageIndex === idx;
            return (
              <div
                key={stg.key}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
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

      {/* CORE SECTION (Section 8 & 9): ACCEPTED DONORS ONLY */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Accepted Donors for This Request ({acceptedDonors.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only voluntary donors who explicitly tapped &quot;Accept&quot; on their WhatsApp notification appear here.
            </p>
          </div>

          <button
            onClick={fetchAcceptedDonors}
            disabled={acceptedLoading}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${acceptedLoading ? 'animate-spin' : ''}`} />
            <span>Check for New Responses</span>
          </button>
        </div>

        {acceptedDonors.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Awaiting Voluntary Donor Responses
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Emergency notifications have been sent to eligible nearby donors. To maintain strict medical privacy, donor contact details appear here only after a donor explicitly taps &quot;Accept&quot;.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={fetchAcceptedDonors}
                className="py-2 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all"
              >
                Refresh Responses
              </button>
              <Link
                to="/blood-banks"
                className="py-2 px-4 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all"
              >
                Contact Hospital Blood Centres
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {acceptedDonors.map((donor) => {
              const isSelected = donor.is_selected;

              return (
                <div
                  key={donor.donor_id}
                  className={`p-5 rounded-3xl border transition-all space-y-4 ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/30 shadow-md'
                      : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-2xl bg-rose-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                        {donor.blood_group}
                      </span>
                      <div>
                        <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{donor.name}</span>
                          {isSelected && (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white rounded-full">
                              Selected Donor
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{donor.city} {donor.area ? `(${donor.area})` : ''}</span>
                          <span>•</span>
                          <span className="font-bold text-rose-600">{donor.distance_band}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Accepted
                    </span>
                  </div>

                  {/* Actions & Revealed Contact details */}
                  {isSelected ? (
                    <div className="p-4 bg-white rounded-2xl border border-emerald-200 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Verified Contact Phone:</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{donor.phone || 'Available'}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppForDonor(donor)}
                          className="flex-1 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Open WhatsApp to Send Request</span>
                        </button>

                        <a
                          href={`tel:${donor.phone}`}
                          className="py-2 px-4 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 text-center"
                        >
                          Call
                        </a>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleReselectDonor}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline"
                        >
                          Change Selected Donor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange('fulfilled')}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                        >
                          Mark Donated & Fulfilled &rarr;
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-400 italic">
                        Phone protected until selected
                      </span>
                      <button
                        onClick={() => handleSelectDonor(donor.donor_id)}
                        disabled={selectingDonorId === donor.donor_id}
                        className="py-2 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm disabled:opacity-50"
                      >
                        {selectingDonorId === donor.donor_id ? 'Selecting...' : 'Select This Donor'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Secondary Section: Matched Candidates Directory */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-600" />
              Regional Candidate Donors Filtered by ABO/Rh & Cooldown ({candidates.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Only donors who have granted notification consent and are outside the 3-month cooldown period are surfaced.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Radius:</span>
            <select
              value={radiusKm}
              onChange={(e) => {
                const r = parseInt(e.target.value, 10);
                setRadiusKm(r);
                fetchCandidates(r);
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-rose-600 text-xs"
            >
              <option value={15}>15 km</option>
              <option value={30}>30 km</option>
              <option value={50}>50 km</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {candidates.slice(0, 5).map((cand, idx) => (
            <div
              key={cand.donor_id || idx}
              className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center text-xs">
                  {cand.blood_group}
                </span>
                <div>
                  <div className="font-bold text-slate-800">{cand.name}</div>
                  <div className="text-[11px] text-slate-500">{cand.city} • <span className="font-semibold text-rose-600">{cand.distance_band}</span></div>
                </div>
              </div>

              <span className="text-[10px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                Awaiting Broadcast Response
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
