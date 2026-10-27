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
  History
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [donor, setDonor] = useState(null);
  const [cooldown, setCooldown] = useState(null);
  const [credits, setCredits] = useState({ balance: 0, history: [] });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Modal to confirm a completed donation
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmingDonation, setConfirmingDonation] = useState(false);

  const fetchDonorData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, cooldownRes, creditRes] = await Promise.all([
        api.donors.getProfile().catch((e) => (e.status === 404 ? { donor: null } : Promise.reject(e))),
        api.donors.getCooldownStatus().catch(() => null),
        api.credits.getHistory().catch(() => ({ balance: 0, history: [] }))
      ]);

      if (profileRes && profileRes.donor) {
        setDonor(profileRes.donor);
      } else {
        setDonor(null);
      }

      if (cooldownRes && cooldownRes.success) {
        setCooldown(cooldownRes);
      }

      if (creditRes && creditRes.success) {
        setCredits({ balance: creditRes.balance, history: creditRes.history || [] });
      }
    } catch (err) {
      setError(err.message || 'Failed to load donor dashboard data.');
    } finally {
      setLoading(false);
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
        // Refresh credits and cooldown
        const credRes = await api.credits.getHistory().catch(() => null);
        if (credRes && credRes.success) {
          setCredits({ balance: credRes.balance, history: credRes.history || [] });
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
        <Link
          to="/donor/registration"
          className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all shadow-rose-200"
        >
          Register as Blood Donor
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Heart className="w-7 h-7 text-rose-600 fill-rose-600" />
            Donor Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your availability, 3-month recovery cooldown, and participation credit ledger
          </p>
        </div>

        {/* Verification Status Pill */}
        <div className="flex items-center gap-2">
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
              No active recovery cooldown. As long as your availability toggle is ON and consent is granted, you will receive WhatsApp/email alerts when compatible emergency requests arise in your area.
            </p>
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

      {/* Credit Points & Participation Recognition Ledger */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                BloodBridge Recognition Points
              </h2>
              <p className="text-xs text-slate-500">
                Civic participation ledger celebrating voluntary blood donor readiness
              </p>
            </div>
          </div>

          <div className="bg-amber-50 px-4 py-2 rounded-2xl border border-amber-200 text-center sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Verified Balance</span>
            <span className="text-2xl font-black text-amber-600">{credits.balance} Pts</span>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
          <strong>Important Statutory Disclosure:</strong> Credit points carry zero cash value, cannot be traded or redeemed for money, and strictly <strong>never influence medical compatibility, blood allocation, or patient matching priority</strong> in compliance with the Drugs and Cosmetics Act.
        </div>

        {/* Ledger Entries */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Transaction History
          </h3>

          {credits.history.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No credit events logged yet.</p>
          ) : (
            <div className="space-y-2">
              {credits.history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 block">{entry.reason}</span>
                    <span className="text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleDateString()}</span>
                  </div>
                  <span className="font-bold text-amber-600">+{entry.points} pts</span>
                </div>
              ))}
            </div>
          )}
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
