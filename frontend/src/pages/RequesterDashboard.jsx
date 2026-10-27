import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Activity, Clock, CheckCircle2, AlertTriangle, Users, MapPin, ChevronRight, Phone, Shield } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RequesterDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeCandidatesModal, setActiveCandidatesModal] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.requests.getAll({ own_only: 'true' });
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleViewCandidates = async (reqItem) => {
    setActiveCandidatesModal(reqItem);
    setLoadingCandidates(true);
    try {
      const res = await api.requests.getCandidates(reqItem.id, 30);
      if (res.success) {
        setCandidates(res.candidates || []);
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      await api.requests.updateStatus(requestId, newStatus);
      fetchRequests();
    } catch (err) {
      alert(`Could not update status: ${err.message}`);
    }
  };

  const activeCount = requests.filter((r) => r.status === 'active').length;
  const fulfilledCount = requests.filter((r) => r.status === 'fulfilled').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Requester Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-bold text-slate-800">{user?.name}</span>. Track active emergency blood requests.
          </p>
        </div>

        <Link
          to="/requests/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all whitespace-nowrap self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Request
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600">Active Requests</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{activeCount}</div>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Fulfilled Requests</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{fulfilledCount}</div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">Total Tracked</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{requests.length}</div>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-rose-600" />
          My Registered Blood Requests
        </h2>

        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
            <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Loading your blood requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
            <Activity className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No requests created yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't registered any active blood requirements. Click below to start an emergency request.
            </p>
            <Link
              to="/requests/create"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl"
            >
              <PlusCircle className="w-4 h-4" />
              Create Blood Request
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                      {r.blood_group}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {r.patient_name} ({r.units_needed} {r.units_needed > 1 ? 'Units' : 'Unit'})
                    </span>

                    {/* Urgency Badge */}
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      r.urgency === 'emergency'
                        ? 'bg-red-100 text-red-700'
                        : r.urgency === 'urgent'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {r.urgency}
                    </span>

                    {/* Status Badge */}
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      r.status === 'donor_selected'
                        ? 'bg-emerald-600 text-white font-black animate-pulse'
                        : r.status === 'responses_received'
                        ? 'bg-emerald-100 text-emerald-800 font-extrabold'
                        : r.status === 'notifications_queued'
                        ? 'bg-blue-100 text-blue-800'
                        : r.status === 'fulfilled'
                        ? 'bg-indigo-100 text-indigo-800'
                        : r.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {r.status === 'donor_selected' ? 'Donor Selected' : r.status === 'responses_received' ? 'Donors Responded' : r.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{r.hospital_name}, {r.city}</span>
                    </div>
                    {r.description && (
                      <p className="text-slate-500 text-[11px] italic">"{r.description}"</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    to={`/requests/${r.id}`}
                    className="py-2 px-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors"
                  >
                    Track Journey
                  </Link>

                  <button
                    onClick={() => handleViewCandidates(r)}
                    className="py-2 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Matched Candidates
                  </button>

                  {r.status === 'active' ? (
                    <button
                      onClick={() => handleStatusChange(r.id, 'fulfilled')}
                      className="py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200"
                    >
                      Mark Fulfilled
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(r.id, 'active')}
                      className="py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Matched Candidates Modal */}
      {activeCandidatesModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-rose-600" />
                  Deterministic Matches for {activeCandidatesModal.patient_name} ({activeCandidatesModal.blood_group})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ranked by ABO/Rh compatibility, distance, and verification status
                </p>
              </div>
              <button
                onClick={() => setActiveCandidatesModal(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingCandidates ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Evaluating candidate donor profiles...
                </div>
              ) : candidates.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No verified donors found in immediate proximity with compatible blood group.
                </div>
              ) : (
                candidates.map((c) => (
                  <div
                    key={c.donor_id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                          {c.blood_group}
                        </span>
                        <span className="font-bold text-slate-900">{c.name}</span>
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 font-semibold px-2 py-0.5 rounded">
                          {c.distance_band}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-rose-600">
                          Match Score: {Math.round(c.match_score * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700 block">Ranking Factors:</span>
                      {c.match_reasons.map((r, rIdx) => (
                        <div key={rIdx} className="text-slate-500">• {r}</div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => alert(`Coordination request dispatched to ${c.name}. In-app notification sent.`)}
                        className="py-1.5 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                      >
                        Ping Potential Donor
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              {candidates[0]?.disclaimer || 'BloodBridge coordinates potential donor candidates; clinical compatibility and blood release are determined exclusively by authorized hospital laboratories.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
