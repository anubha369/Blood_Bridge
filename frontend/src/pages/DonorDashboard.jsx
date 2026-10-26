import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, Clock, MapPin, AlertCircle, ToggleLeft, ToggleRight, CheckCircle2, UserCheck, PhoneOff, Calendar } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchDonorProfile = async () => {
    setLoading(true);
    try {
      const res = await api.donors.getProfile();
      if (res.success) {
        setDonor(res.donor);
      }
    } catch (err) {
      if (err.status === 404) {
        setDonor(null); // Not registered as donor yet
      } else {
        setError(err.message || 'Failed to load donor profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonorProfile();
  }, []);

  const handleToggleAvailability = async () => {
    if (!donor) return;
    setUpdating(true);
    const newStatus = donor.availability_status === 'available' ? 'unavailable' : 'available';
    try {
      const res = await api.donors.updateProfile({ availability_status: newStatus });
      if (res.success) {
        setDonor(res.donor);
      }
    } catch (err) {
      alert(`Could not update availability: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleConsent = async () => {
    if (!donor) return;
    setUpdating(true);
    const newConsent = !donor.consent_to_contact;
    try {
      const res = await api.donors.updateProfile({ consent_to_contact: newConsent });
      if (res.success) {
        setDonor(res.donor);
      }
    } catch (err) {
      alert(`Could not update consent: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleWithdrawConsent = async () => {
    if (!window.confirm('Are you sure you want to withdraw contact consent? You will not appear in any emergency donor searches.')) {
      return;
    }
    setUpdating(true);
    try {
      const res = await api.donors.withdrawConsent();
      if (res.success) {
        setDonor({ ...donor, consent_to_contact: false });
      }
    } catch (err) {
      alert(`Could not withdraw consent: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500">Loading donor profile...</p>
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
            Manage your emergency availability and privacy settings
          </p>
        </div>

        {/* Verification Status Pill */}
        <div>
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

      {/* Main Settings Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Donor Identity */}
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

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 w-full">
            Registration Source: <strong className="text-slate-600">{donor.source}</strong>
          </div>
        </div>

        {/* Middle & Right: Controls */}
        <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
            Availability & Privacy Controls
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
              disabled={updating}
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
              <span className="font-bold text-slate-900 text-xs block">Consent to be Contacted</span>
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
                onClick={handleToggleConsent}
                disabled={updating}
                className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl border border-emerald-300 transition-colors"
              >
                Grant Consent
              </button>
            )}
          </div>

          {/* Last Donation Date */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                Last Recorded Donation Date
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {donor.last_donation_date || 'No donation recorded'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              According to NBTC guidelines, donors should wait 90 days (males) or 120 days (females) between whole blood donations.
            </p>
          </div>
        </div>

      </div>

      {/* Privacy Guarantee Notice */}
      <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-5 text-indigo-900 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-indigo-950">BloodBridge Donor Privacy Guarantee:</strong>
          <p className="leading-relaxed">
            We never collect or publicly expose your Aadhaar number, complete home address, or exact GPS coordinates. Requesters only see approximate bands like <strong>"Within 5 km"</strong> and cannot message you without your explicit consent.
          </p>
        </div>
      </div>
    </div>
  );
}
