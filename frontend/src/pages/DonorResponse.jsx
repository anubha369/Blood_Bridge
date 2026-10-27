import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  MapPin,
  Shield,
  BellOff,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';

export default function DonorResponse() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [responseResult, setResponseResult] = useState(null);

  const fetchActionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.whatsapp.getAction(token);
      if (res.success) {
        setData(res);
        if (res.already_responded) {
          setResponseResult({
            action: res.previous_response,
            message: `You previously responded to this request as: ${res.previous_response}.`
          });
        }
      } else {
        setError(res.error || 'Invalid or expired notification link.');
      }
    } catch (err) {
      setError(err.message || 'Could not verify emergency notification link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchActionDetails();
    }
  }, [token]);

  const handleAction = async (actionType) => {
    setSubmitting(true);
    try {
      const res = await api.whatsapp.submitAction(token, actionType);
      if (res.success) {
        setResponseResult(res);
      } else {
        alert(res.error || 'Failed to submit response.');
      }
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Verifying secure notification link...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Notification Link Expired</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'This emergency coordination link is no longer valid or has already been fulfilled.'}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-block py-2.5 px-5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all"
            >
              Go to BloodBridge Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const req = data.request || {};

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Header Badge */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800">
          <Heart className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
          Verified Emergency Blood Request
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Voluntary Donor Response
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Hello <strong className="text-slate-800">{data.donor_name || 'Volunteer'}</strong>. An urgent patient requirement matches your blood group in <strong className="text-slate-800">{req.city}</strong>.
        </p>
      </div>

      {/* Emergency Request Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Required Blood Group</span>
            <div className="text-3xl sm:text-4xl font-black text-rose-600 mt-0.5">
              {req.blood_group}
            </div>
          </div>

          <div className="text-right">
            <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider ${
              req.urgency === 'critical' || req.urgency === 'emergency'
                ? 'bg-red-100 text-red-800 animate-pulse'
                : req.urgency === 'urgent'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {req.urgency || 'Urgent'} Priority
            </span>
            <div className="text-xs font-bold text-slate-700 mt-2">
              {req.units_needed || 1} {req.units_needed > 1 ? 'Units' : 'Unit'} Needed
            </div>
          </div>
        </div>

        {/* Location & Hospital Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase text-[10px]">
              <Building2 className="w-3.5 h-3.5" /> Hospital / Facility
            </div>
            <div className="font-bold text-slate-900 text-sm">{req.hospital_name || 'Designated Hospital'}</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase text-[10px]">
              <MapPin className="w-3.5 h-3.5" /> City & Region
            </div>
            <div className="font-bold text-slate-900 text-sm">{req.city}</div>
          </div>
        </div>

        {/* Response Outcome or Actions */}
        {responseResult ? (
          <div className={`p-6 rounded-2xl border text-center space-y-3 ${
            responseResult.action === 'accepted'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : responseResult.action === 'declined'
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-white shadow-sm">
              {responseResult.action === 'accepted' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              ) : (
                <Clock className="w-7 h-7 text-slate-500" />
              )}
            </div>

            <div>
              <h3 className="font-extrabold text-base">
                {responseResult.action === 'accepted'
                  ? 'Thank You! Your Willingness to Help is Confirmed'
                  : 'Response Recorded'}
              </h3>
              <p className="text-xs mt-1 leading-relaxed max-w-md mx-auto">
                {responseResult.message}
              </p>
            </div>

            {responseResult.action === 'accepted' && (
              <div className="pt-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-white px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
                  <UserCheck className="w-3.5 h-3.5" /> Listed on Requester Coordination Board
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="text-center">
              <h3 className="text-sm font-extrabold text-slate-900">
                Are you feeling healthy, available, and willing to help?
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Your response helps patient families coordinate promptly without delays.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleAction('accepted')}
                disabled={submitting}
                className="py-3.5 px-4 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 shadow-emerald-200 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I Am Willing to Help (Accept)</span>
              </button>

              <button
                onClick={() => handleAction('declined')}
                disabled={submitting}
                className="py-3.5 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 text-slate-400" />
                <span>Not Available Right Now (Decline)</span>
              </button>
            </div>

            {/* Secondary Profile & Consent Controls */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                onClick={() => handleAction('unavailable')}
                disabled={submitting}
                className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Pause My Availability Temporarily
              </button>

              <button
                onClick={() => handleAction('withdrawn_consent')}
                disabled={submitting}
                className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1.5"
              >
                <BellOff className="w-3.5 h-3.5" />
                Withdraw Notification Consent
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statutory Health Disclaimer Banner */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold">Medical Safety & Clinical Coordination Notice:</strong>
          <p className="leading-relaxed text-amber-800">
            Accepting this emergency notification indicates voluntary willingness to coordinate with the patient family. BloodBridge is an emergency coordination platform, not a medical authority. Final donor screening, hemoglobin check, ABO/Rh cross-matching, and transfusion compatibility decisions are performed exclusively by authorized hospital blood bank pathologists.
          </p>
        </div>
      </div>

      <div className="text-center pt-2">
        <Link
          to="/"
          className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
        >
          &larr; Back to BloodBridge Vision-X Homepage
        </Link>
      </div>
    </div>
  );
}
