import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShieldCheck,
  Clock,
  MapPin,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  UserCheck,
  PhoneOff,
  Calendar,
  Award,
  Sparkles,
  Check,
  AlertTriangle,
  History,
  Send,
  ExternalLink,
  Copy,
  RefreshCw,
  Unlink,
  Gift,
  Ticket,
  TrendingUp
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [donor, setDonor] = useState(null);
  const [cooldown, setCooldown] = useState(null);
  const [credits, setCredits] = useState({ balance: 0, history: [] });
  const [wallet, setWallet] = useState({
    balance: 0,
    total_earned: 0,
    total_redeemed: 0,
    recent_transactions: [],
    active_redemptions: [],
    next_monthly_reward: {
      is_tracking: false,
      available_since: null,
      days_accumulated: 0,
      days_required: 30,
      days_remaining: 30,
      eligible: false
    }
  });
  const [catalog, setCatalog] = useState([]);
  const [redeemingBenefitId, setRedeemingBenefitId] = useState(null);
  const [checkingMonthly, setCheckingMonthly] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(null);
  const [creditActionError, setCreditActionError] = useState(null);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Modal to confirm a completed donation
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmingDonation, setConfirmingDonation] = useState(false);

  // Telegram integration state
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramLinkData, setTelegramLinkData] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [togglingTelegramConsent, setTogglingTelegramConsent] = useState(false);
  const [unlinkingTelegram, setUnlinkingTelegram] = useState(false);

  // Incoming blood coordination requests
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [respondingToRequestId, setRespondingToRequestId] = useState(null);
  const [claimingRecord, setClaimingRecord] = useState(false);
  const [claimError, setClaimError] = useState(null);

  const fetchDonorData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, cooldownRes, walletRes, catalogRes, telegramRes, contactRequestsRes] = await Promise.all([
        api.donors.getProfile().catch((e) => (e.status === 404 ? { donor: null } : Promise.reject(e))),
        api.donors.getCooldownStatus().catch(() => null),
        api.credits.getWallet().catch(() => null),
        api.credits.getCatalog().catch(() => null),
        api.telegram.getStatus().catch(() => null),
        api.donors.getContactRequests().catch(() => ({ notifications: [] }))
      ]);

      if (profileRes && profileRes.donor) {
        setDonor(profileRes.donor);
      } else {
        setDonor(null);
      }

      if (cooldownRes && cooldownRes.success) {
        setCooldown(cooldownRes);
      }

      if (walletRes && walletRes.success && walletRes.wallet) {
        setWallet(walletRes.wallet);
        setCredits({
          balance: walletRes.wallet.balance,
          history: walletRes.wallet.recent_transactions || []
        });
      }

      if (catalogRes && catalogRes.success && catalogRes.catalog) {
        setCatalog(catalogRes.catalog);
      }

      if (telegramRes && telegramRes.success) {
        setTelegramStatus(telegramRes);
      }

      const notifs = contactRequestsRes?.notifications || contactRequestsRes?.requests || [];
      setIncomingRequests(notifs);
    } catch (err) {
      setError(err.message || 'Failed to load donor dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemBenefit = async (benefit) => {
    if (wallet.balance < benefit.cost) {
      setCreditActionError(`Insufficient credits. You need ${benefit.cost} credits, but have ${wallet.balance}.`);
      return;
    }
    const confirmed = window.confirm(`Redeem "${benefit.title}" for ${benefit.cost} credits?`);
    if (!confirmed) return;

    setRedeemingBenefitId(benefit.id);
    setCreditActionError(null);
    setRedemptionSuccess(null);
    try {
      const res = await api.credits.redeem(benefit.id);
      if (res.success) {
        setRedemptionSuccess(`Successfully redeemed "${benefit.title}"! ${res.voucher ? `Voucher Code: ${res.voucher.voucher_code}` : ''}`);
        const walletRes = await api.credits.getWallet().catch(() => null);
        if (walletRes && walletRes.success && walletRes.wallet) {
          setWallet(walletRes.wallet);
          setCredits({
            balance: walletRes.wallet.balance,
            history: walletRes.wallet.recent_transactions || []
          });
        }
      } else {
        setCreditActionError(res.error || 'Failed to redeem reward.');
      }
    } catch (err) {
      setCreditActionError(err.message || 'Error occurred during redemption.');
    } finally {
      setRedeemingBenefitId(null);
    }
  };

  const handleCheckMonthlyReward = async () => {
    setCheckingMonthly(true);
    setCreditActionError(null);
    setRedemptionSuccess(null);
    try {
      const res = await api.credits.checkMonthly();
      if (res.success) {
        if (res.reward_awarded) {
          setRedemptionSuccess(res.message);
        } else {
          setCreditActionError(res.message);
        }
        const walletRes = await api.credits.getWallet().catch(() => null);
        if (walletRes && walletRes.success && walletRes.wallet) {
          setWallet(walletRes.wallet);
          setCredits({
            balance: walletRes.wallet.balance,
            history: walletRes.wallet.recent_transactions || []
          });
        }
      } else {
        setCreditActionError(res.error || 'Failed to check monthly reward.');
      }
    } catch (err) {
      setCreditActionError(err.message || 'Error checking monthly reward.');
    } finally {
      setCheckingMonthly(false);
    }
  };

  const handleCopyVoucher = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucherCode(code);
    setTimeout(() => setCopiedVoucherCode(null), 2500);
  };

  const handleRespondToRequest = async (requestId, action) => {
    setRespondingToRequestId(requestId);
    try {
      const res = await api.donors.respondToContactRequest(requestId, action);
      if (res.success) {
        alert(res.message);
        const updated = await api.donors.getContactRequests().catch(() => null);
        const updatedNotifs = updated?.notifications || updated?.requests || [];
        setIncomingRequests(updatedNotifs);
      } else {
        alert(res.error || 'Failed to update response.');
      }
    } catch (err) {
      alert(`Response error: ${err.message}`);
    } finally {
      setRespondingToRequestId(null);
    }
  };

  const [reconfirmingId, setReconfirmingId] = useState(null);
  const handleReconfirmAvailability = async (requestId, action) => {
    setReconfirmingId(requestId);
    try {
      const res = await api.requests.reconfirmDonor(requestId, action, 'portal');
      if (res.success) {
        alert(res.message);
        const updated = await api.donors.getContactRequests().catch(() => null);
        const updatedNotifs = updated?.notifications || updated?.requests || [];
        setIncomingRequests(updatedNotifs);
      } else {
        alert(res.error || 'Failed to submit confirmation.');
      }
    } catch (err) {
      alert(`Reconfirmation error: ${err.message}`);
    } finally {
      setReconfirmingId(null);
    }
  };

  const fetchTelegramStatus = async () => {
    setTelegramLoading(true);
    try {
      const res = await api.telegram.getStatus();
      if (res && res.success) {
        setTelegramStatus(res);
      }
    } catch (e) {
      console.warn('Failed to refresh Telegram status:', e.message);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleGenerateTelegramCode = async () => {
    setGeneratingCode(true);
    setCopiedCode(false);
    try {
      const res = await api.telegram.getLinkCode();
      if (res && res.success) {
        setTelegramLinkData(res);
      }
    } catch (err) {
      alert(`Could not generate Telegram linking code: ${err.message}`);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleToggleTelegramConsent = async () => {
    if (!telegramStatus) return;
    setTogglingTelegramConsent(true);
    const newConsent = !telegramStatus.telegram_opt_in;
    try {
      const res = await api.telegram.updateConsent(newConsent);
      if (res && res.success) {
        setTelegramStatus((prev) => ({
          ...prev,
          telegram_opt_in: newConsent
        }));
      }
    } catch (err) {
      alert(`Could not update Telegram notification setting: ${err.message}`);
    } finally {
      setTogglingTelegramConsent(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Telegram account? You will stop receiving instant emergency alerts on Telegram.')) {
      return;
    }
    setUnlinkingTelegram(true);
    try {
      const res = await api.telegram.unlink();
      if (res && res.success) {
        setTelegramLinkData(null);
        await fetchTelegramStatus();
      }
    } catch (err) {
      alert(`Could not disconnect Telegram: ${err.message}`);
    } finally {
      setUnlinkingTelegram(false);
    }
  };

  useEffect(() => {
    fetchDonorData();
  }, []);

  const handleToggleAvailability = async () => {
    if (!donor) return;
    setUpdating(true);
    const newStatus = donor.availability_status === 'available' ? 'unavailable' : 'available';
    try {
      const res = await api.donors.toggleAvailability(newStatus);
      if (res.success) {
        setDonor({ ...donor, availability_status: newStatus });
        // Refresh wallet and credits
        const walletRes = await api.credits.getWallet().catch(() => null);
        if (walletRes && walletRes.success && walletRes.wallet) {
          setWallet(walletRes.wallet);
          setCredits({ balance: walletRes.wallet.balance, history: walletRes.wallet.recent_transactions || [] });
        }
      }
    } catch (err) {
      alert(`Could not update availability: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleWithdrawConsent = async () => {
    if (!window.confirm('Are you sure you want to withdraw contact consent? You will not appear in emergency searches.')) {
      return;
    }
    setUpdating(true);
    try {
      const res = await api.donors.withdrawConsent();
      if (res.success) {
        setDonor({ ...donor, consent_to_contact: false, consent_status: 'withdrawn' });
      }
    } catch (err) {
      alert(`Could not withdraw consent: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleGrantConsent = async () => {
    setUpdating(true);
    try {
      const res = await api.donors.grantConsent();
      if (res.success) {
        setDonor({ ...donor, consent_to_contact: true, consent_status: 'consented' });
      }
    } catch (err) {
      alert(`Could not grant consent: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDonationSubmit = async (e) => {
    e.preventDefault();
    setConfirmingDonation(true);
    try {
      const res = await api.donors.confirmDonation({ donation_date: donationDate });
      if (res.success) {
        setShowDonationModal(false);
        await fetchDonorData();
      }
    } catch (err) {
      alert(err.message || 'Failed to record donation.');
    } finally {
      setConfirmingDonation(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500">Loading donor profile & cooldown data...</p>
      </div>
    );
  }

  const handleClaimGoogleFormRecord = async () => {
    setClaimingRecord(true);
    setClaimError(null);
    try {
      const res = await api.donors.claimGoogleFormRecord();
      if (res && res.success) {
        await fetchDonorData();
      } else {
        setClaimError(res?.error || 'Could not find a Google Form record matching your verified phone number.');
      }
    } catch (err) {
      setClaimError(err.message || 'Could not find an unclaimed registration matching your verified mobile number.');
    } finally {
      setClaimingRecord(false);
    }
  };

  if (!donor) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8 fill-rose-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">Complete Your Donor Registration</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          You are currently registered as a general user. Complete your blood group and approximate location to help save lives during emergencies.
        </p>

        {claimError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 max-w-md mx-auto">
            {claimError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/donor/registration"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all shadow-rose-200"
          >
            Register as Blood Donor
          </Link>
          <button
            type="button"
            onClick={handleClaimGoogleFormRecord}
            disabled={claimingRecord}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all disabled:opacity-50"
          >
            <span>{claimingRecord ? 'Searching Records...' : 'Claim Google Form Record'}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Already filled out our Google Form? Click "Claim Google Form Record" to automatically link it via your verified mobile number.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Heart className="w-8 h-8 text-rose-600 fill-rose-600" />
            <span>Donor Portal</span>
          </h1>
          <p className="text-[17px] text-slate-600 mt-1.5">
            Manage your availability, 3-month recovery cooldown, and participation credit ledger
          </p>
        </div>

        {/* Verification Status Pill */}
        <div className="flex items-center gap-2">
          {donor.source === 'google_forms' && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-bold text-blue-800 bg-blue-100 rounded-full border border-blue-300">
              📋 Google Forms Linked
            </span>
          )}
          {donor.verification_status === 'verified' ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 rounded-full border border-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Donor
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 rounded-full border border-amber-300">
              <Clock className="w-4 h-4 text-amber-600" />
              Verification Pending
            </span>
          )}
        </div>
      </div>

      {/* Google Forms Information Banner if source is google_forms */}
      {donor.source === 'google_forms' && (
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 text-sm font-bold">
            📋
          </div>
          <div className="space-y-1 text-xs text-blue-950">
            <strong className="block text-sm font-bold text-blue-900">
              Google Forms Donor Record Connected
            </strong>
            <p className="leading-relaxed text-blue-800">
              Your donor registration was received via our community Google Form and is securely connected to your portal account. Your blood group ({donor.blood_group}) and response preferences are preserved.
            </p>
          </div>
        </div>
      )}

      {/* Verification Status Banner if pending_verification */}
      {donor.verification_status === 'pending_verification' && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-950">
            <strong className="block text-sm font-bold text-amber-900">
              Registration Status: Pending Clinical Verification
            </strong>
            <p className="leading-relaxed text-amber-800">
              Your profile is active in preliminary emergency matching. Routine clinical verification by healthcare coordinators is underway.
            </p>
          </div>
        </div>
      )}

      {/* Cooldown Status Alert Banner */}
      {cooldown && cooldown.in_cooldown ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-900">
            <strong className="block text-sm font-bold text-amber-950">
              Recovery Cooldown Active: {cooldown.days_remaining} Days Remaining
            </strong>
            <p className="leading-relaxed">
              In accordance with NBTC whole blood safety guidelines, you donated on <strong>{donor.last_donation_date}</strong>. You are currently paused from emergency notifications until <strong>{new Date(cooldown.cooldown_until).toLocaleDateString()}</strong> to protect your iron stores.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-emerald-900">
            <strong className="block text-sm font-bold text-emerald-950">
              Eligible for Emergency Notifications
            </strong>
            <p className="leading-relaxed">
              No active recovery cooldown. As long as your availability toggle is ON and consent is granted, you will receive Telegram alerts when compatible emergency requests arise in your area.
            </p>
          </div>
        </div>
      )}

      {/* Incoming Emergency Blood Requests (Telegram / Web) */}
      {incomingRequests.length > 0 && (
        <div className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
              <span>Incoming Emergency Blood Requests ({incomingRequests.length})</span>
            </h2>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Synchronized with Telegram Bot
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incomingRequests.map((req) => {
              const isAccepted = req.donor_response === 'accepted';
              const isDeclined = req.donor_response === 'declined';
              const isPending = !isAccepted && !isDeclined;

              return (
                <div
                  key={req.notification_id || req.request_id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    isAccepted
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : isDeclined
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-rose-50/40 border-rose-200 ring-2 ring-rose-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-2xl bg-rose-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                        {req.blood_group}
                      </span>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {req.patient_name || 'Emergency Patient'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {req.hospital_name || 'Hospital'}, {req.city}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {req.urgency || 'Urgent'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-3 pt-1">
                    <span>Required Units: <strong>{req.units_needed || 1}</strong></span>
                    <span>•</span>
                    <span className="text-slate-400">
                      Received: {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {isPending ? (
                    <div className="pt-2 border-t border-rose-100/60 space-y-2">
                      <p className="text-xs font-semibold text-slate-700">
                        Can you respond to this request?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRespondToRequest(req.request_id, 'accept')}
                          disabled={respondingToRequestId === req.request_id}
                          className="flex-1 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{respondingToRequestId === req.request_id ? 'Responding...' : 'Accept Request'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondToRequest(req.request_id, 'decline')}
                          disabled={respondingToRequestId === req.request_id}
                          className="py-2 px-3 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ) : isAccepted ? (
                    <div className="pt-2 border-t border-emerald-100 space-y-2">
                      {req.is_selected ? (
                        req.confirmation_status === 'confirmed' ? (
                          <div className="text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>You confirmed availability! Requester has your verified contact details.</span>
                          </div>
                        ) : req.confirmation_status === 'declined' ? (
                          <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded-xl italic">
                            You declined reconfirmation for this request.
                          </div>
                        ) : (
                          <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 space-y-2">
                            <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                              <Sparkles className="w-4 h-4 text-rose-600" />
                              <span>You have been designated as the primary donor!</span>
                            </div>
                            <p className="text-[11px] text-rose-800">
                              The requester selected you for this emergency. Please reconfirm your availability:
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleReconfirmAvailability(req.request_id, 'confirm')}
                                disabled={reconfirmingId === req.request_id}
                                className="flex-1 py-1.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                              >
                                {reconfirmingId === req.request_id ? 'Confirming...' : 'Confirm Availability'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReconfirmAvailability(req.request_id, 'decline')}
                                disabled={reconfirmingId === req.request_id}
                                className="py-1.5 px-3 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>You accepted this request. Waiting for requester donor selection.</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 italic">
                      You declined this request.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Identity & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Donor Identity Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-rose-600 text-white font-extrabold flex items-center justify-center text-3xl shadow-lg shadow-rose-200">
            {donor.blood_group}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">{donor.name}</h3>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {donor.area ? `${donor.area}, ` : ''}{donor.city}
            </p>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 w-full space-y-1">
            <div>Registration Source: <strong className="text-slate-600">{donor.source}</strong></div>
            <div>Consent: <strong className={donor.consent_to_contact ? 'text-emerald-600' : 'text-rose-600'}>{donor.consent_to_contact ? 'Active' : 'Withdrawn'}</strong></div>
          </div>
        </div>

        {/* Middle & Right: Controls & Actions */}
        <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
            Availability & Cooldown Management
          </h2>

          {/* Availability Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-900 text-xs block">Emergency Availability Status</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {donor.availability_status === 'available'
                  ? 'You are active and visible in emergency matching searches.'
                  : 'You are temporarily paused and will not receive requests.'}
              </p>
            </div>
            <button
              onClick={handleToggleAvailability}
              disabled={updating || (cooldown && cooldown.in_cooldown)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                donor.availability_status === 'available'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-300 hover:bg-slate-400 text-slate-800'
              }`}
            >
              {donor.availability_status === 'available' ? 'Available' : 'Unavailable'}
            </button>
          </div>

          {/* Contact Consent Control */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-900 text-xs block">Contact Consent Agreement</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {donor.consent_to_contact
                  ? 'Requesters can send you verified coordination notifications.'
                  : 'Consent withdrawn: You will NOT appear in public searches.'}
              </p>
            </div>
            {donor.consent_to_contact ? (
              <button
                onClick={handleWithdrawConsent}
                disabled={updating}
                className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl border border-red-300 transition-colors"
              >
                Withdraw Consent
              </button>
            ) : (
              <button
                onClick={handleGrantConsent}
                disabled={updating}
                className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl border border-emerald-300 transition-colors"
              >
                Grant Consent
              </button>
            )}
          </div>

          {/* Record Donation Action */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                Did You Recently Donate Blood?
              </span>
              <p className="text-[11px] text-slate-500">
                Confirm your donation date so we can activate your 3-month recovery cooldown.
              </p>
            </div>
            <button
              onClick={() => setShowDonationModal(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all"
            >
              Record Completed Donation
            </button>
          </div>
        </div>

      </div>

      {/* Telegram Emergency Alerts Integration Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Telegram Emergency Alert Network
                </h2>
                {telegramStatus?.linked ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 rounded-full border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 bg-slate-100 rounded-full border border-slate-300">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Instant emergency alerts with interactive Accept and Decline buttons directly on Telegram
              </p>
            </div>
          </div>

          <button
            onClick={fetchTelegramStatus}
            disabled={telegramLoading}
            className="self-start sm:self-center p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${telegramLoading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
        </div>

        {telegramStatus?.linked ? (
          /* Connected View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Telegram User</span>
                <span className="font-bold text-slate-900">
                  {telegramStatus.telegram_username ? `@${telegramStatus.telegram_username}` : 'Linked via Bot'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Masked Chat ID</span>
                <span className="font-mono font-bold text-slate-800">
                  {telegramStatus.telegram_chat_id_masked || '••••'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Connected Since</span>
                <span className="font-semibold text-slate-700">
                  {telegramStatus.telegram_linked_at ? new Date(telegramStatus.telegram_linked_at).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>

            {/* Notification Consent Toggle */}
            <div className="flex items-center justify-between p-4 bg-sky-50/50 rounded-2xl border border-sky-100">
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  Telegram Emergency Alerts
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {telegramStatus.telegram_opt_in
                    ? 'Active: You will receive direct messages with Accept/Decline buttons for compatible urgent requests.'
                    : 'Paused: Alerts to this Telegram account are temporarily suspended.'}
                </p>
              </div>
              <button
                onClick={handleToggleTelegramConsent}
                disabled={togglingTelegramConsent}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  telegramStatus.telegram_opt_in
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-300 hover:bg-slate-400 text-slate-800'
                }`}
              >
                {telegramStatus.telegram_opt_in ? 'Alerts ON' : 'Alerts Paused'}
              </button>
            </div>

            {/* Disconnect Action */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                You can also use <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">/stop</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">/unlink</code> inside the bot at any time.
              </span>
              <button
                onClick={handleUnlinkTelegram}
                disabled={unlinkingTelegram}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <Unlink className="w-3.5 h-3.5" />
                {unlinkingTelegram ? 'Disconnecting...' : 'Disconnect Telegram'}
              </button>
            </div>
          </div>
        ) : (
          /* Not Connected View */
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect your Telegram account to receive instant notifications during critical blood shortages. You can accept or decline requests in one tap without needing to open the website.
            </p>

            {!telegramLinkData ? (
              <div>
                <button
                  onClick={handleGenerateTelegramCode}
                  disabled={generatingCode}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition-all shadow-sky-200"
                >
                  <Send className="w-3.5 h-3.5 -rotate-12" />
                  {generatingCode ? 'Generating Secure Code...' : 'Connect Telegram'}
                </button>
              </div>
            ) : (
              <div className="p-5 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900 block">
                      Your One-Time Linking Code (Expires in 15 mins)
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-base font-mono font-black text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-sky-200 tracking-wider">
                        {telegramLinkData.code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(telegramLinkData.code)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <a
                    href={telegramLinkData.deep_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow transition-all shadow-sky-200 self-start sm:self-center"
                  >
                    <span>Open in Telegram</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="border-t border-sky-100 pt-3 space-y-1.5 text-xs text-sky-950">
                  <span className="font-bold block">Quick Instructions:</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                    <li>Click <strong>Open in Telegram</strong> above, or search for <strong>@{telegramLinkData.bot_username || 'Blood_Bridgebot'}</strong> in Telegram.</li>
                    <li>Tap <strong>Start</strong> in the bot, or send: <code className="bg-white px-1 py-0.5 rounded text-slate-800">/start {telegramLinkData.code}</code></li>
                    <li>Once sent, tap <strong>I've Sent the Code (Check Status)</strong> below to confirm your connection.</li>
                  </ol>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={fetchTelegramStatus}
                    className="text-xs font-bold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    I've Sent the Code (Check Status)
                  </button>
                  <button
                    onClick={() => setTelegramLinkData(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete BloodBridge Credit & Recognition Wallet */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        {/* Action Alerts */}
        {redemptionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{redemptionSuccess}</span>
            </div>
            <button
              onClick={() => setRedemptionSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {creditActionError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{creditActionError}</span>
            </div>
            <button
              onClick={() => setCreditActionError(null)}
              className="text-rose-700 hover:text-rose-900 font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header & Balance Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Credit & Recognition Wallet
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Voluntary Rewards
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Civic participation ledger celebrating voluntary blood donor availability and fulfilled donations
              </p>
            </div>
          </div>

          <button
            onClick={fetchDonorData}
            disabled={loading}
            className="self-start md:self-center inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            Refresh Wallet
          </button>
        </div>

        {/* 3 Wallet Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Verified Available Balance */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-white p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Available Balance
              </span>
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600 leading-none">
                {wallet.balance}
              </span>
              <span className="text-sm font-bold text-amber-700">Credits</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Ready to redeem for platform recognition and partner benefits
            </p>
          </div>

          {/* 2. Lifetime Earned */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white p-5 rounded-2xl border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Lifetime Earned
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 leading-none">
                {wallet.total_earned}
              </span>
              <span className="text-sm font-bold text-emerald-700">Credits</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Earned via registration, fulfilled donations, and availability
            </p>
          </div>

          {/* 3. Total Redeemed */}
          <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-50 to-white p-5 rounded-2xl border border-indigo-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                Total Redeemed
              </span>
              <Gift className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-indigo-600 leading-none">
                {wallet.total_redeemed}
              </span>
              <span className="text-sm font-bold text-indigo-700">Credits</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Redeemed across {wallet.active_redemptions?.length || 0} claimed benefit vouchers
            </p>
          </div>
        </div>

        {/* Monthly Availability Reward Tracker */}
        <div className="p-5 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-slate-50 rounded-2xl border border-sky-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Monthly Availability Reward (+10 Credits)
                </h3>
                {wallet.next_monthly_reward?.is_tracking ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Tracking Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Paused
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                Maintain your emergency availability continuously for 30 full days to earn 10 reward credits. Pausing availability resets tracking.
              </p>
            </div>

            <button
              onClick={handleCheckMonthlyReward}
              disabled={checkingMonthly}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 ${
                wallet.next_monthly_reward?.eligible
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
              }`}
            >
              {checkingMonthly ? (
                'Checking...'
              ) : wallet.next_monthly_reward?.eligible ? (
                'Claim 10 Credits Reward!'
              ) : (
                'Check Eligibility'
              )}
            </button>
          </div>

          {wallet.next_monthly_reward?.is_tracking ? (
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                <span>
                  {wallet.next_monthly_reward?.days_accumulated || 0} of 30 continuous days completed
                </span>
                <span className="text-sky-700 font-bold">
                  {wallet.next_monthly_reward?.days_remaining === 0
                    ? 'Eligible for reward!'
                    : `${wallet.next_monthly_reward?.days_remaining} days remaining`}
                </span>
              </div>
              {/* Visual Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((wallet.next_monthly_reward?.days_accumulated || 0) / 30) * 100))}%`
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Tracked continuously since {wallet.next_monthly_reward?.available_since ? new Date(wallet.next_monthly_reward.available_since).toLocaleDateString() : 'recent'}.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Your donor availability is currently paused. Toggle your status to <strong>Available</strong> in the controls above to start tracking continuous days toward your next monthly reward.
              </span>
            </div>
          )}
        </div>

        {/* Benefits & Redemptions Catalog */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-indigo-600" />
                Available Recognition & Benefits Catalog
              </h3>
              <p className="text-[11px] text-slate-500">
                Redeem your earned credits for legitimate, non-monetary volunteer honors and partner health vouchers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {(catalog.length > 0 ? catalog : [
              { id: 'lifesaver_badge', title: 'Lifesaver Recognition Badge', cost: 15, description: 'Digital badge of honor displayed on your donor profile.' },
              { id: 'voluntary_donor_certificate', title: 'Voluntary Donor Certificate', cost: 20, description: 'Official downloadable certificate acknowledging voluntary donation.' },
              { id: 'priority_notification_routing', title: 'Priority Emergency Routing', cost: 25, description: 'Preferred routing in local blood alerts when urgent shortages arise.' },
              { id: 'partner_health_screening_voucher', title: 'Partner Health Voucher', cost: 30, description: 'Voucher for complimentary wellness diagnostic checkups.' }
            ]).map((benefit) => {
              const canAfford = wallet.balance >= benefit.cost;
              const isRedeeming = redeemingBenefitId === benefit.id;

              return (
                <div
                  key={benefit.id}
                  className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                        <Award className="w-3 h-3 text-amber-600" />
                        {benefit.cost} Credits
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {benefit.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => handleRedeemBenefit(benefit)}
                      disabled={!canAfford || isRedeeming}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        canAfford
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isRedeeming ? 'Redeeming...' : canAfford ? 'Redeem Reward' : `Need ${benefit.cost - wallet.balance} more`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Vouchers & Redemptions */}
        {wallet.active_redemptions && wallet.active_redemptions.length > 0 && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-indigo-600" />
              Active Claimed Benefit Vouchers ({wallet.active_redemptions.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wallet.active_redemptions.map((voucher) => (
                <div
                  key={voucher.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 block">{voucher.benefit_name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-indigo-700">
                        {voucher.voucher_code}
                      </code>
                      <button
                        onClick={() => handleCopyVoucher(voucher.voucher_code)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold"
                      >
                        {copiedVoucherCode === voucher.voucher_code ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                      {voucher.status}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {new Date(voucher.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auditable Transaction Ledger */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Verified Transaction History
          </h3>

          {!wallet.recent_transactions || wallet.recent_transactions.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-slate-100">
              No credit transactions logged yet. Complete registration or maintain availability to earn credits.
            </p>
          ) : (
            <div className="space-y-2">
              {wallet.recent_transactions.map((entry) => {
                const isPositive = (entry.points || 0) > 0;
                let badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                if (!isPositive) badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300';
                else if (entry.event_type === 'registration_reward') badgeStyle = 'bg-sky-100 text-sky-800 border-sky-300';
                else if (entry.event_type === 'monthly_availability_reward') badgeStyle = 'bg-indigo-100 text-indigo-800 border-indigo-300';
                else if (entry.event_type === 'admin_adjustment') badgeStyle = 'bg-purple-100 text-purple-800 border-purple-300';

                return (
                  <div
                    key={entry.id}
                    className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle}`}>
                          {entry.event_type?.replace(/_/g, ' ')?.toUpperCase()}
                        </span>
                        <span className="font-bold text-slate-900">{entry.reason}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Logged on {new Date(entry.timestamp || entry.created_at).toLocaleString()}
                        {entry.balance_after !== undefined ? ` • Balance after: ${entry.balance_after} Pts` : ''}
                      </span>
                    </div>

                    <div className="self-end sm:self-center">
                      <span className={`text-sm font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? `+${entry.points}` : entry.points} Pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legal Statutory Disclaimer Notice */}
        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 text-[11px] text-amber-950 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Statutory Compliance Disclosure (Section 27, Drugs & Cosmetics Act):</strong>
            <p className="mt-0.5 text-amber-900">
              BloodBridge Credit Points represent non-monetary volunteer recognition and carry strictly zero cash or financial redemption value. Credits <strong>never influence medical matching priority, clinical blood compatibility, emergency triage, or patient allocation</strong>. All blood donations are voluntary and non-remunerated.
            </p>
          </div>
        </div>
      </div>

      {/* Record Donation Modal */}
      {showDonationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Completed Donation</h3>
                <p className="text-xs text-slate-500">Thank you for your lifesaving gift!</p>
              </div>
              <button onClick={() => setShowDonationModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleConfirmDonationSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Donation *</label>
                <input
                  type="date"
                  required
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                Confirming this will automatically start your 3-calendar-month recovery cooldown. During this period, emergency notifications will be paused for your safety.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDonationModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmingDonation}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow"
                >
                  {confirmingDonation ? 'Recording...' : 'Confirm Donation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
