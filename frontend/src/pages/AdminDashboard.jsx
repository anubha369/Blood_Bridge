import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Activity, Building2, BookOpen, CheckCircle2, Clock, XCircle, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { api } from '../api/client';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [donors, setDonors] = useState([]);
  const [integrationLogs, setIntegrationLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingDonorId, setUpdatingDonorId] = useState(null);
  const [donorFilter, setDonorFilter] = useState('all');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [sumRes, donRes, logsRes] = await Promise.all([
        api.admin.getSummary(),
        api.admin.getDonors(),
        api.admin.getIntegrationLogs({ limit: 10 })
      ]);

      if (sumRes.success) setMetrics(sumRes.metrics);
      if (donRes.success) setDonors(donRes.donors || []);
      if (logsRes.success) setIntegrationLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleVerifyDonor = async (donorId, status) => {
    setUpdatingDonorId(donorId);
    try {
      const res = await api.admin.verifyDonor(donorId, status);
      if (res.success) {
        setDonors((prev) =>
          prev.map((d) => (d.id === donorId ? { ...d, verification_status: status } : d))
        );
        // Refresh metrics
        const sumRes = await api.admin.getSummary();
        if (sumRes.success) setMetrics(sumRes.metrics);
      }
    } catch (err) {
      alert(`Verification update failed: ${err.message}`);
    } finally {
      setUpdatingDonorId(null);
    }
  };

  const filteredDonors = donors.filter((d) => {
    if (donorFilter === 'pending') return d.verification_status === 'pending_verification';
    if (donorFilter === 'verified') return d.verification_status === 'verified';
    if (donorFilter === 'google_forms') return d.source === 'google_forms';
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500">Loading administrative console and platform analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-amber-600" />
            Administrative Console & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time verification queue, audit events, and platform metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/rag"
            className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Manage RAG Documents
          </Link>

          <button
            onClick={fetchAdminData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Donors</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.donors.total}</div>
            <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
              {metrics.donors.verified} Verified
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Review</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{metrics.donors.pending}</div>
            <div className="text-[11px] text-slate-400 mt-1">Requires admin action</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Requests</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">{metrics.requests.active}</div>
            <div className="text-[11px] text-slate-400 mt-1">{metrics.requests.fulfilled} Fulfilled</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Centres</div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">{metrics.blood_banks.total}</div>
            <div className="text-[11px] text-slate-400 mt-1">Hospital blood banks</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved RAG Docs</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">{metrics.rag_pipeline.approved_documents}</div>
            <div className="text-[11px] text-slate-400 mt-1">{metrics.rag_pipeline.total_chunks} Chunks indexed</div>
          </div>
        </div>
      )}

      {/* Blood Group Distribution Bar */}
      {metrics?.donors?.group_distribution && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            Donor Inventory by Blood Group
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => {
              const count = metrics.donors.group_distribution[grp] || 0;
              return (
                <div key={grp} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-xs font-bold text-slate-500">{grp}</div>
                  <div className="text-lg font-extrabold text-rose-600">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Donor Verification Management Queue */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              Donor Verification & Management Queue
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review Google Form registrations and platform submissions before enabling contact workflows
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setDonorFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                donorFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All ({donors.length})
            </button>
            <button
              onClick={() => setDonorFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                donorFilter === 'pending' ? 'bg-white text-amber-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Pending ({donors.filter((d) => d.verification_status === 'pending_verification').length})
            </button>
            <button
              onClick={() => setDonorFilter('google_forms')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                donorFilter === 'google_forms' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Google Forms ({donors.filter((d) => d.source === 'google_forms').length})
            </button>
          </div>
        </div>

        {/* Donors Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Donor Name</th>
                <th className="py-3 px-3">Blood Group</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonors.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-slate-900">{d.name}</td>
                  <td className="py-3.5 px-3">
                    <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      {d.blood_group}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">{d.area ? `${d.area}, ` : ''}{d.city}</td>
                  <td className="py-3.5 px-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      d.source === 'google_forms'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {d.source}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    {d.verification_status === 'verified' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                      </span>
                    )}
                    {d.verification_status === 'pending_verification' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-amber-600" /> Pending
                      </span>
                    )}
                    {d.verification_status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3 text-red-600" /> Rejected
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {d.verification_status !== 'verified' && (
                        <button
                          onClick={() => handleVerifyDonor(d.id, 'verified')}
                          disabled={updatingDonorId === d.id}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {d.verification_status !== 'rejected' && (
                        <button
                          onClick={() => handleVerifyDonor(d.id, 'rejected')}
                          disabled={updatingDonorId === d.id}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-800 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Sync Logs */}
      {integrationLogs.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Recent External Integration Events (Google Forms Webhook)
          </h3>
          <div className="space-y-2">
            {integrationLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  <span className="font-bold text-slate-800">{log.source}</span>
                  <span className="text-slate-500">[{log.event_type}]</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
