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
  ArrowRight,
  Check,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RequestDetails() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [acceptedDonors, setAcceptedDonors] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [radiusKm, setRadiusKm] = useState(30);
  const [loading, setLoading] = useState(true);
  const [acceptedLoading, setAcceptedLoading] = useState(false);
  const [contactRequestsLoading, setContactRequestsLoading] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [alertingDonors, setAlertingDonors] = useState(false);
  const [selectingDonorId, setSelectingDonorId] = useState(null);
  const [reconfirming, setReconfirming] = useState(false);
  const [reselecting, setReselecting] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [sendingToDonorId, setSendingToDonorId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

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
      console.warn('Accepted donors fetch notice:', err.message);
    } finally {
      setAcceptedLoading(false);
    }
  };

  const fetchContactRequests = async () => {
    try {
      setContactRequestsLoading(true);
      const res = await api.requests.getContactRequests(id);
      if (res.success) {
        setContactRequests(res.contact_requests || []);
      }
    } catch (err) {
      console.warn('Contact requests fetch notice:', err.message);
    } finally {
      setContactRequestsLoading(false);
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
      fetchContactRequests();
      fetchCandidates();

      // Realtime polling: refresh contact requests and request status every 5s while viewing
      const pollTimer = setInterval(() => {
        fetchAcceptedDonors();
        fetchContactRequests();
      }, 5000);
      return () => clearInterval(pollTimer);
    }
  }, [id]);

  // Stage 2: Alert Donors via Telegram
  const handleAlertDonors = async () => {
    try {
      setAlertingDonors(true);
      const res = await api.requests.alertDonors(id);
      if (res.success) {
        showToast(res.message || 'Emergency Telegram alerts dispatched to potential donors.', 'success');
        await fetchRequest();
        await fetchContactRequests();
      } else {
        showToast(res.error || 'Failed to dispatch alerts.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error dispatching alerts.', 'error');
    } finally {
      setAlertingDonors(false);
    }
  };

  // Stage 4: Select an accepted donor
  const handleSelectDonor = async (donorId) => {
    try {
      setSelectingDonorId(donorId);
      const res = await api.requests.selectDonor(id, donorId, false);
      if (res.success) {
        setRequest(res.request);
        await Promise.all([fetchAcceptedDonors(), fetchContactRequests()]);
        showToast(res.message || 'Donor selected! Reconfirmation message dispatched via Telegram.', 'success');
      } else {
        showToast(res.error || 'Failed to select donor.', 'error');
      }
    } catch (err) {
      showToast(`Selection error: ${err.message}`, 'error');
    } finally {
      setSelectingDonorId(null);
    }
  };

  // Stage 4: Reconfirm donor (manual phone record or decline)
  const handleReconfirmDonor = async (action) => {
    try {
      setReconfirming(true);
      const res = await api.requests.reconfirmDonor(id, action, 'requester_phone');
      if (res.success) {
        setRequest(res.request);
        await Promise.all([fetchAcceptedDonors(), fetchContactRequests()]);
        showToast(res.message || 'Donor reconfirmation recorded.', 'success');
      } else {
        showToast(res.error || 'Failed to update reconfirmation.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error recording reconfirmation.', 'error');
    } finally {
      setReconfirming(false);
    }
  };

  // Stage 4: Reselect another donor
  const handleReselectDonor = async () => {
    if (!window.confirm('Are you sure you want to change the selected donor? This will allow you to select another eligible donor who accepted.')) return;
    try {
      setReselecting(true);
      const res = await api.requests.reselectDonor(id);
      if (res.success) {
        setRequest(res.request);
        await Promise.all([fetchAcceptedDonors(), fetchContactRequests()]);
        showToast('Donor selection cleared. You may select another donor who accepted.', 'info');
      } else {
        showToast(res.error || 'Failed to reselect donor.', 'error');
      }
    } catch (err) {
      showToast(`Reselection error: ${err.message}`, 'error');
    } finally {
      setReselecting(false);
    }
  };

  // Stage 5: Fulfill Request
  const handleFulfillRequest = async () => {
    try {
      setFulfilling(true);
      const res = await api.requests.fulfill(id);
      if (res.success) {
        setShowFulfillModal(false);
        setRequest(res.request);
        await Promise.all([fetchAcceptedDonors(), fetchContactRequests()]);
        showToast(res.message || 'Request marked fulfilled! 3-month recovery cooldown activated for the donor.', 'success');
      } else {
        showToast(res.error || 'Failed to fulfill request.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error fulfilling request.', 'error');
    } finally {
      setFulfilling(false);
    }
  };

  // Cancel Request
  const handleCancelRequest = async () => {
    if (!window.confirm('Are you sure you want to cancel this emergency request? Any active notifications will be stopped.')) return;
    try {
      setStatusUpdating(true);
      const res = await api.requests.cancel(id);
      if (res.success) {
        setRequest(res.request);
        await Promise.all([fetchAcceptedDonors(), fetchContactRequests()]);
        showToast('Request cancelled successfully.', 'info');
      } else {
        showToast(res.error || 'Failed to cancel request.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error cancelling request.', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSendTelegramToCandidate = async (donorId) => {
    setSendingToDonorId(donorId);
    try {
      const res = await api.requests.sendDonorRequest(id, donorId);
      if (res.success) {
        showToast(res.message || 'Telegram request sent successfully. Waiting for donor response.', 'success');
        await fetchContactRequests();
      } else {
        showToast(res.error || 'Failed to dispatch Telegram request.', 'error');
      }
    } catch (err) {
      let friendlyMsg = err.message || 'Could not send Telegram request.';
      if (err.status === 401 || friendlyMsg.includes('session is invalid') || friendlyMsg.includes('User account no longer exists')) {
        friendlyMsg = 'Session expired; please log in again.';
      } else if (err.status === 404 && friendlyMsg.includes('not found')) {
        friendlyMsg = 'Donor profile or blood request was not found.';
      } else if (err.status === 400 && friendlyMsg.includes('already')) {
        friendlyMsg = 'Duplicate request already exists. A coordination request has already been sent to this donor.';
      } else if (err.status === 400 && friendlyMsg.includes('unavailable')) {
        friendlyMsg = 'Donor is currently marked unavailable.';
      } else if (err.status === 400 && friendlyMsg.includes('linked')) {
        friendlyMsg = 'Donor has not linked their Telegram account yet.';
      } else if (err.status === 400 && friendlyMsg.includes('enabled')) {
        friendlyMsg = 'Donor has not enabled Telegram notifications.';
      } else if (err.status === 400 && friendlyMsg.includes('expired')) {
        friendlyMsg = 'This blood request has expired or is no longer active.';
      } else if (err.status === 502) {
        friendlyMsg = 'Telegram service temporarily unavailable.';
      }
      showToast(friendlyMsg, 'error');
    } finally {
      setSendingToDonorId(null);
    }
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

  // Status journey 5 stages
  const stages = [
    { key: 'registered', label: '1. Registered', desc: 'Request created in system' },
    { key: 'alerting_donors', label: '2. Alerting Donors', desc: 'Notifications dispatched' },
    { key: 'donors_responded', label: '3. Donors Responded', desc: 'Accept / Decline tracked' },
    { key: 'donor_selected', label: '4. Donor Selected', desc: 'Reconfirmed coordination' },
    { key: 'fulfilled', label: '5. Fulfilled', desc: 'Blood received & cooldown' }
  ];

  let currentStageIndex = 0;
  if (['registered', 'submitted', 'searching'].includes(request.status)) currentStageIndex = 0;
  else if (['alerting_donors', 'notifications_queued'].includes(request.status)) currentStageIndex = 1;
  else if (['donors_responded', 'responses_received'].includes(request.status)) currentStageIndex = 2;
  else if (request.status === 'donor_selected') currentStageIndex = 3;
  else if (request.status === 'fulfilled') currentStageIndex = 4;
  else if (request.status === 'cancelled') currentStageIndex = -1;

  // Auto-advance visual stage if responses or selected donor exist
  if (currentStageIndex < 3 && request.selected_donor_id) {
    currentStageIndex = 3;
  } else if (currentStageIndex < 2 && contactRequests.some(c => c.status === 'accepted' || c.status === 'declined')) {
    currentStageIndex = 2;
  }

  const selectedDonorContact = contactRequests.find(c => c.donor_id === request.selected_donor_id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/requester/dashboard" className="hover:text-rose-600 font-semibold">Requester Dashboard</Link>
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
              fetchContactRequests();
            }}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm"
            title="Refresh Live Responses"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isOwner && request.status !== 'fulfilled' && request.status !== 'cancelled' && (
            <div className="flex items-center gap-2">
              {request.selected_donor_id && (
                <button
                  onClick={() => setShowFulfillModal(true)}
                  disabled={statusUpdating || fulfilling}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Blood Received</span>
                </button>
              )}
              <button
                onClick={handleCancelRequest}
                disabled={statusUpdating}
                className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200"
              >
                Cancel Request
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5-STAGE LIFECYCLE COORDINATION STEPPER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              5-Stage Coordination Workflow
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live status progression from donor alert to verified fulfillment
            </p>
          </div>
          <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
            request.status === 'fulfilled'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : request.status === 'cancelled'
              ? 'bg-red-100 text-red-800 border border-red-300'
              : request.status === 'donor_selected'
              ? 'bg-rose-100 text-rose-800 border border-rose-300'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            Current Status: {request.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
          {stages.map((stg, idx) => {
            const isDone = currentStageIndex >= idx;
            const isCurrent = currentStageIndex === idx;
            return (
              <div
                key={stg.key}
                className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-rose-50/90 border-rose-500 text-rose-900 shadow-sm ring-2 ring-rose-500/25'
                    : isDone
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Stage {idx + 1}
                  </span>
                  {isDone ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-rose-600' : 'text-emerald-600'}`} />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>
                <div className="text-xs font-extrabold truncate">{stg.label.replace(/^\d+\.\s*/, '')}</div>
                <div className="text-[10px] opacity-75 mt-0.5 truncate">{stg.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STAGE 2 ACTION: ALERT MATCHED DONORS VIA TELEGRAM */}
      {(request.status === 'registered' || request.status === 'submitted' || request.status === 'searching') && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 p-6 rounded-3xl border border-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-rose-950 flex items-center gap-2">
              <Send className="w-4 h-4 text-rose-600" />
              <span>Stage 2: Alert Verified Donors via Telegram</span>
            </h3>
            <p className="text-xs text-rose-800/80 leading-relaxed max-w-2xl">
              Dispatch high-priority instant notifications with interactive Accept and Decline buttons to verified nearby donors whose blood group is compatible.
            </p>
          </div>
          <button
            onClick={handleAlertDonors}
            disabled={alertingDonors}
            className="py-2.5 px-5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-auto disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{alertingDonors ? 'Alerting Donors...' : 'Alert Donors Now'}</span>
          </button>
        </div>
      )}

      {/* STAGE 4: SELECTED DONOR CARD & RECONFIRMATION WORKFLOW */}
      {request.selected_donor_id && (
        <div className="bg-white rounded-3xl border-2 border-rose-500/40 p-6 sm:p-7 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-md shadow-rose-900/20">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">Stage 4 Active</span>
                <h2 className="text-lg font-black text-slate-900">
                  Designated Coordination Donor
                </h2>
              </div>
            </div>

            {/* Reconfirmation Status Badge */}
            <div className="flex items-center gap-2">
              {request.confirmation_status === 'confirmed' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Availability Reconfirmed
                </span>
              ) : request.confirmation_status === 'declined' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-300">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Donor Declined Reconfirmation
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  Reconfirmation Pending
                </span>
              )}
            </div>
          </div>

          {/* Selected Donor Details & Contact Reveal */}
          <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block">Donor Name &amp; Identity</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {selectedDonorContact?.name || 'Selected Voluntary Donor'}
              </span>
              <span className="text-slate-500 block text-[11px] mt-0.5">
                Blood Group: <strong className="text-rose-600">{selectedDonorContact?.blood_group || request.blood_group}</strong>
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-semibold block">Approximate Location</span>
              <span className="font-bold text-slate-800">
                {selectedDonorContact?.city || request.city} {selectedDonorContact?.area ? `(${selectedDonorContact.area})` : ''}
              </span>
              <span className="text-slate-500 block text-[11px] mt-0.5">
                Distance: {selectedDonorContact?.distance_band || 'Within Search Radius'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-semibold block">Contact Phone Number</span>
              {selectedDonorContact?.phone ? (
                <a
                  href={`tel:${selectedDonorContact.phone}`}
                  className="font-mono font-bold text-emerald-700 text-sm hover:underline flex items-center gap-1 mt-0.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{selectedDonorContact.phone}</span>
                </a>
              ) : (
                <span className="font-mono text-slate-500 italic text-[11px]">Contact available via Telegram</span>
              )}
            </div>
          </div>

          {/* Reconfirmation Workflow Controls */}
          {isOwner && request.status !== 'fulfilled' && request.status !== 'cancelled' && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-600">
                {request.confirmation_status === 'pending' ? (
                  <p>
                    A reconfirmation prompt was sent to the donor via Telegram. If you spoke to the donor by phone, record it below:
                  </p>
                ) : request.confirmation_status === 'confirmed' ? (
                  <p className="text-emerald-700 font-semibold">
                    Donor confirmed readiness! Please proceed to the blood bank / hospital for donation.
                  </p>
                ) : (
                  <p className="text-red-700 font-semibold">
                    The donor indicated they cannot make it. Please select another donor from the list below.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {request.confirmation_status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleReconfirmDonor('confirm')}
                      disabled={reconfirming}
                      className="py-2 px-3.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{reconfirming ? 'Recording...' : 'Record Phone Confirmation'}</span>
                    </button>
                    <button
                      onClick={() => handleReconfirmDonor('decline')}
                      disabled={reconfirming}
                      className="py-2 px-3 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-all"
                    >
                      Donor Declined
                    </button>
                  </>
                )}

                <button
                  onClick={handleReselectDonor}
                  disabled={reselecting}
                  className="py-2 px-3.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{reselecting ? 'Resetting...' : 'Select Another Donor'}</span>
                </button>

                <button
                  onClick={() => setShowFulfillModal(true)}
                  className="py-2 px-4 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Blood Received</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAGE 5: FULFILLED COMPLETION NOTICE */}
      {request.status === 'fulfilled' && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-3xl border-2 border-emerald-400 p-6 sm:p-7 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Stage 5 Completed</span>
              <h2 className="text-lg font-black text-emerald-950">
                Blood Requirement Successfully Fulfilled
              </h2>
            </div>
          </div>
          <p className="text-xs text-emerald-900/80 leading-relaxed">
            Fulfillment was confirmed on <strong>{request.fulfilled_at ? new Date(request.fulfilled_at).toLocaleString() : new Date(request.updated_at).toLocaleString()}</strong>.
            A mandatory <strong>3-month recovery cooldown</strong> has been recorded for the donor in the database to safeguard their iron stores and well-being. Emergency notifications for this donor will remain suspended until the cooldown period expires.
          </p>
        </div>
      )}

      {/* STAGE 3: RESPONDED DONORS LIST */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Stage 3: Responded Donors ({contactRequests.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Donors who accepted or declined the emergency request. Only voluntary donors who <strong>accepted</strong> are eligible for selection.
            </p>
          </div>

          <button
            onClick={() => {
              fetchAcceptedDonors();
              fetchContactRequests();
            }}
            disabled={acceptedLoading || contactRequestsLoading}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${acceptedLoading || contactRequestsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Responses</span>
          </button>
        </div>

        {contactRequests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Awaiting Donor Responses
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Emergency Telegram requests have been dispatched to potential compatible donors. As donors tap Accept or Decline, their responses will appear below immediately.
              </p>
            </div>
            {isOwner && (
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleAlertDonors}
                  disabled={alertingDonors}
                  className="py-2 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all"
                >
                  {alertingDonors ? 'Alerting...' : 'Dispatch Telegram Alerts'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contactRequests.map((cr) => {
              const isAccepted = cr.status === 'accepted';
              const isDeclined = cr.status === 'declined';
              const isPending = !isAccepted && !isDeclined;
              const isCurrentlySelected = request.selected_donor_id === cr.donor_id;

              return (
                <div
                  key={cr.donor_id}
                  className={`p-5 rounded-3xl border transition-all space-y-4 ${
                    isCurrentlySelected
                      ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-md'
                      : isAccepted
                      ? 'bg-emerald-50/60 border-emerald-400 shadow-sm'
                      : isDeclined
                      ? 'bg-slate-50 border-slate-200 opacity-65'
                      : 'bg-white border-amber-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-2xl bg-rose-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                        {cr.blood_group}
                      </span>
                      <div>
                        <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{cr.name}</span>
                          {cr.verification_status && ['verified', 'verified_by_authorized_personnel'].includes(cr.verification_status) && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> Verified
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{cr.city} {cr.area ? `(${cr.area})` : ''}</span>
                          <span>•</span>
                          <span className="font-bold text-rose-600">{cr.distance_band}</span>
                        </div>
                      </div>
                    </div>

                    {/* Response Status Badge */}
                    {isAccepted && (
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Accepted
                      </span>
                    )}
                    {isDeclined && (
                      <span className="text-[10px] font-extrabold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                        <XCircle className="w-3 h-3 text-slate-500" /> Declined
                      </span>
                    )}
                    {isPending && (
                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Pending
                      </span>
                    )}
                  </div>

                  {/* Donor Contact & Selection Action */}
                  {isAccepted ? (
                    <div className="p-4 bg-white rounded-2xl border border-emerald-200 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Contact Phone:</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {cr.phone || 'Provided upon coordination'}
                        </span>
                      </div>

                      {isOwner && request.status !== 'fulfilled' && request.status !== 'cancelled' && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          {isCurrentlySelected ? (
                            <span className="text-xs font-black text-rose-700 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" /> Currently Selected Donor
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectDonor(cr.donor_id)}
                              disabled={selectingDonorId === cr.donor_id}
                              className="py-2 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{selectingDonorId === cr.donor_id ? 'Selecting...' : 'Select Donor'}</span>
                            </button>
                          )}

                          {cr.phone && (
                            <a
                              href={`tel:${cr.phone}`}
                              className="py-1.5 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl border border-emerald-300 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Call</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ) : isDeclined ? (
                    <div className="p-3 bg-slate-100/70 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                      <span className="italic">Donor declined this request.</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded">
                        Not Selectable
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-1 text-xs">
                      <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Awaiting donor response via Telegram bot</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Matched Regional Candidate Donors (ABO/Rh compatible) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-600" />
              Regional Compatible Donors ({candidates.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Only donors who have granted notification consent and are outside their 3-month cooldown period are surfaced.
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
          {candidates.slice(0, 5).map((cand, idx) => {
            const hasSent = contactRequests.some((cr) => cr.donor_id === cand.donor_id);

            return (
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

                {hasSent ? (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    Telegram Dispatched
                  </span>
                ) : (
                  <button
                    onClick={() => handleSendTelegramToCandidate(cand.donor_id)}
                    disabled={sendingToDonorId === cand.donor_id}
                    className="py-1.5 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>{sendingToDonorId === cand.donor_id ? 'Sending...' : 'Send Telegram Request'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CONFIRM BLOOD RECEIVED (STAGE 5) CONFIRMATION MODAL */}
      {showFulfillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Confirm Blood Received</h3>
                <p className="text-xs text-slate-500">Stage 5 – Mark Request Fulfilled</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2 text-xs text-emerald-950">
              <p className="font-bold">
                Have you received the required blood units from the designated voluntary donor?
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Completing this step will update the status to <strong>Fulfilled</strong>, record the fulfillment timestamp, and automatically initiate a <strong>3-month notification recovery cooldown</strong> for the donor to protect their iron stores.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFulfillModal(false)}
                disabled={fulfilling}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFulfillRequest}
                disabled={fulfilling}
                className="px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{fulfilling ? 'Completing...' : 'Yes, Confirm Blood Received'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 text-xs font-bold py-3.5 px-4 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-3 max-w-md ${
          toast.type === 'success'
            ? 'bg-emerald-950 text-emerald-100 border border-emerald-800'
            : toast.type === 'error'
            ? 'bg-rose-950 text-rose-100 border border-rose-800'
            : 'bg-slate-900 text-slate-100 border border-slate-700'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-sky-400 flex-shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
