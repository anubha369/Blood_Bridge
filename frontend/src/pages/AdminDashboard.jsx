import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Users,
  Activity,
  Building2,
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  FileText,
  Send,
  Award,
  Calendar,
  Search,
  Filter,
  Check,
  Phone
} from 'lucide-react';
import { api } from '../api/client';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('donors');
  const [metrics, setMetrics] = useState(null);
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [whatsappJobs, setWhatsappJobs] = useState([]);
  const [creditLedger, setCreditLedger] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [integrationLogs, setIntegrationLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Actions State
  const [donorFilter, setDonorFilter] = useState('all');
  const [donorSearch, setDonorSearch] = useState('');
  const [updatingDonorId, setUpdatingDonorId] = useState(null);

  // Sync Missed Google Form Records State
  const [syncingRecords, setSyncingRecords] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  const handleSyncRecentRecords = async () => {
    setSyncingRecords(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await api.admin.syncRecentRecords();
      setSyncResult(res);
      await fetchAdminData();
    } catch (err) {
      if (err.data && err.data.configured === false) {
        setSyncResult(err.data);
      } else {
        setSyncError(err.message || 'Failed to synchronize missed records.');
      }
    } finally {
      setSyncingRecords(false);
    }
  };

  // Cooldown Override Modal State
  const [cooldownModalDonor, setCooldownModalDonor] = useState(null);
  const [overrideCooldownDate, setOverrideCooldownDate] = useState('');
  const [overrideAvailability, setOverrideAvailability] = useState('available');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [sumRes, donRes, reqRes, waRes, credRes, logsRes, auditRes] = await Promise.all([
        api.admin.getSummary().catch(() => ({ success: false })),
        api.admin.getDonors().catch(() => ({ success: false })),
        api.requests.getAll().catch(() => ({ success: false })),
        api.admin.getWhatsappJobs().catch(() => ({ success: false })),
        api.admin.getCreditLedger().catch(() => ({ success: false })),
        api.admin.getIntegrationLogs({ limit: 20 }).catch(() => ({ success: false })),
        api.admin.getAuditLogs().catch(() => ({ success: false }))
      ]);

      if (sumRes.success) setMetrics(sumRes.metrics);
      if (donRes.success) setDonors(donRes.donors || []);
      if (reqRes.success) setRequests(reqRes.requests || []);
      if (waRes.success) setWhatsappJobs(waRes.jobs || []);
      if (credRes.success) setCreditLedger(credRes.entries || []);
      if (logsRes.success) setIntegrationLogs(logsRes.logs || []);
      if (auditRes.success) setAuditLogs(auditRes.logs || []);
    } catch (err) {
      console.error('Error fetching admin console data:', err);
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
        const sumRes = await api.admin.getSummary();
        if (sumRes.success) setMetrics(sumRes.metrics);
      }
    } catch (err) {
      alert(`Verification update failed: ${err.message}`);
    } finally {
      setUpdatingDonorId(null);
    }
  };

  const handleOpenCooldownModal = (donor) => {
    setCooldownModalDonor(donor);
    setOverrideCooldownDate(donor.cooldown_until ? donor.cooldown_until.substring(0, 10) : '');
    setOverrideAvailability(donor.availability_status || 'available');
  };

  const handleSaveCooldownOverride = async (e) => {
    e.preventDefault();
    if (!cooldownModalDonor) return;
    setOverrideSubmitting(true);
    try {
      const res = await api.admin.overrideCooldown(cooldownModalDonor.id, {
        cooldown_until: overrideCooldownDate || null,
        availability_status: overrideAvailability
      });

      if (res.success) {
        setDonors((prev) =>
          prev.map((d) => (d.id === cooldownModalDonor.id ? { ...d, ...res.donor } : d))
        );
        setCooldownModalDonor(null);
      }
    } catch (err) {
      alert(`Failed to override cooldown: ${err.message}`);
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId, newStatus) => {
    try {
      const res = await api.requests.updateStatus(requestId, newStatus);
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
        );
      }
    } catch (err) {
      alert(`Could not update request status: ${err.message}`);
    }
  };

  // Filtered Donors
  const filteredDonors = donors.filter((d) => {
    const matchesFilter =
      donorFilter === 'all'
        ? true
        : donorFilter === 'pending'
        ? d.verification_status === 'pending_verification'
        : donorFilter === 'verified'
        ? d.verification_status === 'verified'
        : donorFilter === 'cooldown'
        ? (d.cooldown_until && new Date(d.cooldown_until) > new Date()) || d.donation_history_status === 'reported_recent'
        : donorFilter === 'google_forms'
        ? d.source === 'google_forms'
        : true;

    const matchesSearch =
      donorSearch.trim() === ''
        ? true
        : d.name?.toLowerCase().includes(donorSearch.toLowerCase()) ||
          d.city?.toLowerCase().includes(donorSearch.toLowerCase()) ||
          d.blood_group?.toLowerCase().includes(donorSearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-semibold text-slate-600">Loading administrative operations console...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase rounded-md bg-rose-100 text-rose-800">
              Uttar Pradesh State Operations
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-500">Live Coordination Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-rose-600" />
            Administrative Operations & Verification Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review donor eligibility, manage 3-month cooldown overrides, inspect WhatsApp queues, and monitor participation ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/rag"
            className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            RAG Knowledge Base
          </Link>

          <button
            onClick={fetchAdminData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm transition-colors"
            title="Refresh All Operations Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* High-Level Metric Tiles */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Donors</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{metrics.donors?.total || donors.length}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {metrics.donors?.verified || 0} Verified
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Review</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{metrics.donors?.pending || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Awaiting check</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Requests</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{requests.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{requests.filter(r => r.status === 'fulfilled').length} Fulfilled</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Dispatches</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{whatsappJobs.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Broadcast alerts</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Points Ledger</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{creditLedger.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Audit records</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">RAG Knowledge</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{metrics.rag_pipeline?.approved_documents || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{metrics.rag_pipeline?.total_chunks || 0} Chunks</div>
          </div>
        </div>
      )}

      {/* Blood Group Distribution Bar */}
      {metrics?.donors?.group_distribution && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Uttar Pradesh Regional Donor Inventory by Blood Group
            </h3>
            <span className="text-[11px] text-slate-400">Total Available: {donors.filter(d => d.availability_status === 'available').length}</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => {
              const count = metrics.donors.group_distribution[grp] || 0;
              return (
                <div key={grp} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <div className="text-[11px] font-bold text-slate-500">{grp}</div>
                  <div className="text-lg font-black text-rose-600">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-3 overflow-x-auto text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('donors')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'donors'
              ? 'border-rose-600 text-rose-600 bg-rose-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Donors & Cooldowns ({donors.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'requests'
              ? 'border-rose-600 text-rose-600 bg-rose-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          Emergency Requests ({requests.length})
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'whatsapp'
              ? 'border-rose-600 text-rose-600 bg-rose-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          WhatsApp Queue ({whatsappJobs.length})
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'ledger'
              ? 'border-rose-600 text-rose-600 bg-rose-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          Participation Points Ledger ({creditLedger.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'audit'
              ? 'border-rose-600 text-rose-600 bg-rose-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Audit & Webhooks ({auditLogs.length + integrationLogs.length})
        </button>
      </div>

      {/* TAB 1: DONORS & COOLDOWNS */}
      {activeTab === 'donors' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={donorSearch}
                onChange={(e) => setDonorSearch(e.target.value)}
                placeholder="Search by name, city, or group..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setDonorFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  donorFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                All ({donors.length})
              </button>
              <button
                onClick={() => setDonorFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  donorFilter === 'pending' ? 'bg-white text-amber-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Pending ({donors.filter((d) => d.verification_status === 'pending_verification').length})
              </button>
              <button
                onClick={() => setDonorFilter('verified')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  donorFilter === 'verified' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Verified ({donors.filter((d) => d.verification_status === 'verified').length})
              </button>
              <button
                onClick={() => setDonorFilter('cooldown')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  donorFilter === 'cooldown' ? 'bg-white text-rose-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                In Cooldown ({donors.filter((d) => (d.cooldown_until && new Date(d.cooldown_until) > new Date()) || d.donation_history_status === 'reported_recent').length})
              </button>
              <button
                onClick={() => setDonorFilter('google_forms')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  donorFilter === 'google_forms' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600'
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
                  <th className="py-3 px-3">Cooldown / Recovery Status</th>
                  <th className="py-3 px-3">Consent & Verification</th>
                  <th className="py-3 px-3 text-right">Actions & Overrides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDonors.map((d) => {
                  const isInCooldown = d.cooldown_until && new Date(d.cooldown_until) > new Date();
                  const isDateMissing = d.donation_history_status === 'reported_recent';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{d.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Source: {d.source}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs">
                          {d.blood_group}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        <div>{d.city}</div>
                        {d.area && <div className="text-[10px] text-slate-400">{d.area}</div>}
                      </td>
                      <td className="py-3.5 px-3">
                        {isInCooldown ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-rose-600" /> Cooldown until {new Date(d.cooldown_until).toLocaleDateString()}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">Suppressed from broadcasts</div>
                          </div>
                        ) : isDateMissing ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-amber-600" /> Donated recently (Date pending)
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">Suppressed until verified</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Eligible ({d.availability_status})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1">
                          {d.verification_status === 'verified' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-max">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                            </span>
                          )}
                          {d.verification_status === 'pending_verification' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full w-max">
                              <Clock className="w-3 h-3 text-amber-600" /> Pending Check
                            </span>
                          )}
                          {d.verification_status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full w-max">
                              <XCircle className="w-3 h-3 text-red-600" /> Rejected
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            Consent: {d.consent_to_contact ? 'Granted' : 'Withdrawn'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
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
                          <button
                            onClick={() => handleOpenCooldownModal(d)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Edit Cooldown
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EMERGENCY BLOOD REQUESTS */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-600" />
                Active Emergency Blood Requests ({requests.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor live patient coordination requests across Uttar Pradesh hospitals
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Request ID & Patient</th>
                  <th className="py-3 px-3">Blood Group</th>
                  <th className="py-3 px-3">Units Needed</th>
                  <th className="py-3 px-3">Hospital & City</th>
                  <th className="py-3 px-3">Urgency</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Update Lifecycle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 font-mono">{r.id.substring(0, 8)}...</div>
                      <div className="text-[11px] text-slate-500">{r.patient_name || 'Protected Patient'}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs">
                        {r.blood_group}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-800">{r.units_needed} units</td>
                    <td className="py-3.5 px-3 text-slate-600">
                      <div>{r.hospital_name}</div>
                      <div className="text-[10px] text-slate-400">{r.city}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        r.urgency === 'critical'
                          ? 'bg-red-100 text-red-800 animate-pulse'
                          : r.urgency === 'urgent'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {r.urgency || 'standard'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <select
                        value={r.status}
                        onChange={(e) => handleUpdateRequestStatus(r.id, e.target.value)}
                        className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-rose-500"
                      >
                        <option value="submitted">submitted</option>
                        <option value="validating">validating</option>
                        <option value="searching">searching</option>
                        <option value="notifications_queued">notifications_queued</option>
                        <option value="responses_received">responses_received</option>
                        <option value="coordination_in_progress">coordination_in_progress</option>
                        <option value="fulfilled">fulfilled</option>
                        <option value="cancelled">cancelled</option>
                        <option value="closed">closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WHATSAPP QUEUE */}
      {activeTab === 'whatsapp' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                WhatsApp Outbound Notification Log & Dispatches
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official WhatsApp Cloud API payload records & development simulation logs
              </p>
            </div>
            <div className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              Development Mock Active (Simulated Dispatches)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Recipient Phone</th>
                  <th className="py-3 px-3">Request ID</th>
                  <th className="py-3 px-3">Template</th>
                  <th className="py-3 px-3">Delivery Status</th>
                  <th className="py-3 px-3">Action Token Preview</th>
                  <th className="py-3 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {whatsappJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No WhatsApp broadcasts sent yet. Use "Create Request" or the WhatsApp simulator to trigger alerts.
                    </td>
                  </tr>
                ) : (
                  whatsappJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-800 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {job.recipient_phone}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                        {job.request_id ? job.request_id.substring(0, 8) + '...' : 'System'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-700">
                        {job.template_name || 'emergency_alert_v1'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          job.status === 'simulated_development_mock'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : job.status === 'sent'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[10px] text-slate-500">
                        {job.action_token ? job.action_token.substring(0, 16) + '...' : 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 text-right text-[10px] text-slate-400">
                        {new Date(job.created_at || Date.now()).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PARTICIPATION POINTS LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Non-Cash Donor Recognition Points Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditable ledger of volunteer engagement points awarded for readiness, verification, and community activity
            </p>
          </div>

          {/* Legal Compliance Banner */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Statutory Blood Coordination Compliance Notice:</strong>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Under the Drugs & Cosmetics Act and National Blood Transfusion Council (NBTC) regulations, blood cannot be traded or bought.
                Points in this ledger are strictly non-cash volunteer recognition tokens. They carry zero monetary redemption value and never affect medical compatibility matching or clinical patient priority.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Ledger ID</th>
                  <th className="py-3 px-3">Donor / User ID</th>
                  <th className="py-3 px-3">Activity Type</th>
                  <th className="py-3 px-3">Points</th>
                  <th className="py-3 px-3">Balance After</th>
                  <th className="py-3 px-3">Idempotency Key</th>
                  <th className="py-3 px-3 text-right">Awarded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {creditLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No points transactions recorded yet. Donors earn points upon profile completion and availability confirmations.
                    </td>
                  </tr>
                ) : (
                  creditLedger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-3 font-mono text-[10px] text-slate-400">
                        {entry.id.substring(0, 8)}...
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                        {entry.user_id ? entry.user_id.substring(0, 12) : 'System'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {entry.activity_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-black text-emerald-600">
                        +{entry.points}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {entry.balance_after || '-'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[10px] text-slate-400">
                        {entry.idempotency_key}
                      </td>
                      <td className="py-3.5 px-3 text-right text-[10px] text-slate-400">
                        {new Date(entry.created_at || Date.now()).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS & WEBHOOK INTEGRATION */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Missed Responses Sync Control */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-extrabold tracking-tight">Google Form & Sheet Response Sync</h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Offline Recovery
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Recover Google Form responses submitted while the server or tunnel was offline. Fetches missing records from Google Sheets and inserts them into Supabase with automatic deduplication.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncRecentRecords}
                  disabled={syncingRecords}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncingRecords ? 'animate-spin' : ''}`} />
                  {syncingRecords ? 'Syncing Missing Records...' : 'Sync Recent Records'}
                </button>
              </div>
            </div>

            {/* Sync Results Banner */}
            {syncResult && (
              <div className={`p-4 rounded-2xl text-xs space-y-3 ${
                syncResult.configured === false
                  ? 'bg-amber-950/60 border border-amber-500/30 text-amber-200'
                  : 'bg-white/10 border border-white/15 text-white'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    {syncResult.configured === false ? (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {syncResult.message || (syncResult.configured === false ? 'Google Sheets Credentials Required' : 'Sync Completed')}
                  </span>
                  {syncResult.configured === false && (
                    <button
                      onClick={() => setShowConfigHelp(!showConfigHelp)}
                      className="text-[11px] underline font-bold text-amber-300 hover:text-white"
                    >
                      {showConfigHelp ? 'Hide Setup Guide' : 'View Setup Guide'}
                    </button>
                  )}
                </div>

                {syncResult.configured !== false && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-black/20 p-2.5 rounded-xl text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Fetched</p>
                      <p className="text-lg font-extrabold text-white">{syncResult.fetched ?? 0}</p>
                    </div>
                    <div className="bg-emerald-950/40 border border-emerald-500/20 p-2.5 rounded-xl text-center">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase">Inserted to Supabase</p>
                      <p className="text-lg font-extrabold text-emerald-300">{syncResult.inserted ?? 0}</p>
                    </div>
                    <div className="bg-amber-950/40 border border-amber-500/20 p-2.5 rounded-xl text-center">
                      <p className="text-[10px] text-amber-400 font-bold uppercase">Skipped (Duplicates)</p>
                      <p className="text-lg font-extrabold text-amber-300">{syncResult.skipped_duplicates ?? 0}</p>
                    </div>
                    <div className="bg-red-950/40 border border-red-500/20 p-2.5 rounded-xl text-center">
                      <p className="text-[10px] text-red-400 font-bold uppercase">Failed</p>
                      <p className="text-lg font-extrabold text-red-300">{syncResult.failed ?? 0}</p>
                    </div>
                  </div>
                )}

                {/* Configuration Guidance Accordion */}
                {(showConfigHelp || syncResult.configured === false) && syncResult.instructions && (
                  <div className="mt-3 p-3 bg-black/40 rounded-xl space-y-2 text-[11px] font-mono text-slate-300 border border-white/10">
                    <p className="font-bold text-amber-300 text-xs">How to configure Google Sheets API access on your backend:</p>
                    {syncResult.instructions.setup_options?.map((opt, i) => (
                      <div key={i} className="space-y-1 pt-1 border-t border-white/5 first:border-0">
                        <p className="font-bold text-white">{opt.method}:</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-400 font-sans">
                          {opt.steps.map((st, j) => (
                            <li key={j}>{st}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {syncError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{syncError}</span>
              </div>
            )}
          </div>

          {/* External Integrations */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Google Forms Webhook Integration Logs
            </h3>
            <p className="text-xs text-slate-500">
              Audit trail of automated Google Sheet submissions routed through Apps Script to BloodBridge
            </p>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {integrationLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{log.source}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{log.event_type}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Internal Audit Events */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              Administrative Security & Governance Event Log
            </h3>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{event.actor_role} ({event.actor_id})</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px]">{event.action}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{event.entity_type} #{event.entity_id}</td>
                      <td className="py-2.5 px-3 text-right text-[10px] text-slate-400">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* COOLDOWN OVERRIDE MODAL */}
      {cooldownModalDonor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Admin Cooldown Override</h3>
                <p className="text-xs text-slate-500">Managing donor: {cooldownModalDonor.name}</p>
              </div>
              <button
                onClick={() => setCooldownModalDonor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCooldownOverride} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cooldown Expiry Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={overrideCooldownDate}
                  onChange={(e) => setOverrideCooldownDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank to immediately clear cooldown and mark donor eligible.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Availability Status
                </label>
                <select
                  value={overrideAvailability}
                  onChange={(e) => setOverrideAvailability(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="available">Available (Willing to Donate)</option>
                  <option value="unavailable">Unavailable (Temporarily Paused)</option>
                  <option value="cooldown">Cooldown (Medical Recovery)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCooldownModalDonor(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideSubmitting}
                  className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all shadow-rose-200 disabled:opacity-50"
                >
                  {overrideSubmitting ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
