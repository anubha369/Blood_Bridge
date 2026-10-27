import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Activity,
  MapPin,
  Heart,
  Clock,
  Phone,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Building2,
  Users,
  Send,
  MessageSquare,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';

export default function CreateRequest() {
  const navigate = useNavigate();

  // 4-Step Wizard State: 1 = Requirement, 2 = Patient Details, 3 = Results, 4 = Coordination
  const [currentStep, setCurrentStep] = useState(1);

  // Natural Language Auto-Fill / Assistant State
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Need 2 units of B+ blood urgently at KGMU Hospital Lucknow tomorrow morning');
  const [parsingAI, setParsingAI] = useState(false);

  // Step 1: Blood Requirement Fields
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [unitsNeeded, setUnitsNeeded] = useState(1);
  const [city, setCity] = useState('Lucknow');
  const [hospitalName, setHospitalName] = useState('');
  const [urgency, setUrgency] = useState('urgent');
  const [contactPhone, setContactPhone] = useState('');

  // Step 2: Patient & Location Details
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [description, setDescription] = useState('');

  // Step 3 & 4: Persistence, Search Results & Coordination
  const [createdRequest, setCreatedRequest] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [bloodBanks, setBloodBanks] = useState([]);
  const [radiusKm, setRadiusKm] = useState(30);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Step 4: WhatsApp Notification Job State
  const [dispatchingWa, setDispatchingWa] = useState(false);
  const [waResult, setWaResult] = useState(null);
  const [selectedDonorForCall, setSelectedDonorForCall] = useState(null);

  const [locations, setLocations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLocations() {
      try {
        const res = await api.donors.getLocations();
        if (res.success && res.locations) {
          setLocations(res.locations);
        }
      } catch (err) {
        // Fallback silently
      }
    }
    loadLocations();
  }, []);

  // Parse natural language with smart assistant
  const handleParseWithAI = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setParsingAI(true);
    setError(null);
    try {
      const res = await api.ai.parseRequest(aiPrompt);
      if (res.success && res.parsed_request) {
        const p = res.parsed_request;
        if (p.blood_group) setBloodGroup(p.blood_group);
        if (p.units_needed) setUnitsNeeded(p.units_needed);
        if (p.hospital_name && p.hospital_name !== 'City Emergency Hospital') setHospitalName(p.hospital_name);
        if (p.location?.city) setCity(p.location.city);
        if (p.urgency) setUrgency(p.urgency);
        if (p.needed_by) setNeededBy(p.needed_by);
        setShowAiAssistant(false);
      }
    } catch (err) {
      setError(err.message || 'Could not extract fields with assistant.');
    } finally {
      setParsingAI(false);
    }
  };

  // Step 1 validation -> Next
  const handleStep1Next = (e) => {
    e.preventDefault();
    if (!bloodGroup || !unitsNeeded || !city || !hospitalName) {
      setError('Please provide blood group, units, city, and hospital name.');
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  // Step 2 submit -> Persist Request & Load Step 3 Results
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setError('Please enter patient or recipient name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        patient_name: patientName.trim(),
        blood_group: bloodGroup,
        units_needed: parseInt(unitsNeeded, 10),
        hospital_name: hospitalName.trim(),
        hospital_address: hospitalAddress ? hospitalAddress.trim() : null,
        city: city.trim(),
        urgency,
        needed_by: neededBy || null,
        description: description ? description.trim() : null,
        contact_phone: contactPhone ? contactPhone.trim() : null
      };

      const res = await api.requests.create(payload);
      if (res.success && res.request) {
        setCreatedRequest(res.request);
        setCurrentStep(3);
        // Load candidates and blood banks
        await fetchResults(res.request.id, radiusKm, city);
      }
    } catch (err) {
      setError(err.message || 'Failed to create blood request.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchResults = async (reqId, radius, cityName) => {
    setResultsLoading(true);
    try {
      const [candRes, bbRes] = await Promise.all([
        api.requests.getCandidates(reqId, radius),
        api.bloodBanks.getAll({ city: cityName, limit: 6 })
      ]);

      if (candRes.success) {
        setCandidates(candRes.candidates || []);
      }
      if (bbRes.success) {
        setBloodBanks(bbRes.blood_banks || []);
      }
    } catch (err) {
      console.error('Error fetching search results:', err);
    } finally {
      setResultsLoading(false);
    }
  };

  // Step 4: Dispatch WhatsApp Notification Jobs
  const handleDispatchWhatsApp = async () => {
    if (!createdRequest) return;
    setDispatchingWa(true);
    try {
      const res = await api.whatsapp.sendRequestNotifications({
        request_id: createdRequest.id,
        radius_km: radiusKm,
        max_recipients: 10
      });
      if (res.success) {
        setWaResult(res);
        setCurrentStep(4);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch WhatsApp notifications.');
    } finally {
      setDispatchingWa(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Blood Requirement' },
    { num: 2, label: 'Patient Details' },
    { num: 3, label: 'Verified Results' },
    { num: 4, label: 'Coordination' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold tracking-wide uppercase">
          <Activity className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
          <span>Emergency Request Journey</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Coordinate an Urgent Blood Requirement
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Four simple steps to find verified regional blood centres and alert consenting voluntary donors.
        </p>
      </div>

      {/* Progress Wizard Stepper */}
      <div className="grid grid-cols-4 gap-2 text-center pb-2">
        {stepsList.map((stg) => {
          const isCurrent = currentStep === stg.num;
          const isDone = currentStep > stg.num;
          return (
            <div
              key={stg.num}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                isCurrent
                  ? 'bg-rose-50 border-rose-600 text-rose-700 shadow-sm ring-2 ring-rose-500/20'
                  : isDone
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                    {stg.num}
                  </span>
                )}
                <span className="hidden sm:inline">{stg.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Blood Requirement */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Smart Assistant Voice/Text Auto-fill Accordion */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAiAssistant(!showAiAssistant)}
                className="text-xs font-bold text-slate-800 flex items-center gap-1.5 hover:text-rose-600 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-rose-600" />
                <span>{showAiAssistant ? 'Hide Smart Speech/Text Assistant' : 'Auto-Fill with Smart Request Parser'}</span>
              </button>
              <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">
                Optional Assistant
              </span>
            </div>

            {showAiAssistant && (
              <form onSubmit={handleParseWithAI} className="space-y-3 pt-2">
                <textarea
                  rows={2}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Need 2 units of B+ blood urgently at KGMU Hospital Lucknow tomorrow morning"
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={parsingAI || !aiPrompt.trim()}
                  className="py-2 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all flex items-center gap-1.5"
                >
                  {parsingAI ? 'Analyzing...' : 'Extract Fields & Pre-Fill'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

          <form onSubmit={handleStep1Next} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Step 1: Blood Requirement Details
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Required Blood Group *</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setBloodGroup(grp)}
                    className={`py-2.5 text-xs font-black rounded-xl border transition-all ${
                      bloodGroup === grp
                        ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Units Needed (Bags / Pints) *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={unitsNeeded}
                  onChange={(e) => setUnitsNeeded(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level *</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="emergency">Critical Emergency (Immediate)</option>
                  <option value="urgent">Urgent (Within 24 Hours)</option>
                  <option value="scheduled">Scheduled Procedure</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  City / District *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  {locations.length > 0 ? (
                    locations.map((loc) => (
                      <option key={loc.name} value={loc.name}>
                        {loc.name} {loc.state ? `(${loc.state})` : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Lucknow">Lucknow (Uttar Pradesh)</option>
                      <option value="Kanpur">Kanpur (Uttar Pradesh)</option>
                      <option value="Varanasi">Varanasi (Uttar Pradesh)</option>
                      <option value="Prayagraj">Prayagraj (Uttar Pradesh)</option>
                      <option value="Agra">Agra (Uttar Pradesh)</option>
                      <option value="Ghaziabad">Ghaziabad (Uttar Pradesh)</option>
                      <option value="Noida">Noida (Uttar Pradesh)</option>
                      <option value="Bareilly">Bareilly (Uttar Pradesh)</option>
                      <option value="Gorakhpur">Gorakhpur (Uttar Pradesh)</option>
                      <option value="Jaipur">Jaipur (Rajasthan)</option>
                      <option value="Delhi">Delhi (NCR)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Hospital or Blood Bank Name *
                </label>
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. KGMU Centenary Hospital"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Requester Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="py-3 px-6 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-2"
              >
                <span>Continue to Patient Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Patient & Hospital Details */}
      {currentStep === 2 && (
        <form onSubmit={handleStep2Submit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Step 2: Patient & Clinical Context
            </h2>
            <span className="text-xs text-rose-600 font-bold">
              {bloodGroup} • {unitsNeeded} {unitsNeeded > 1 ? 'Units' : 'Unit'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name *</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Ramesh Chandra"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Patient Age (Optional)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="e.g. 45"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hospital Ward / Bed / Department</label>
            <input
              type="text"
              value={hospitalAddress}
              onChange={(e) => setHospitalAddress(e.target.value)}
              placeholder="e.g. Emergency Casualty Block, 3rd Floor, ICU Bed 12"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Needed By Date / Time (Optional)</label>
            <input
              type="datetime-local"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Additional Medical Coordination Notes</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Replacement donor required for elective CABG surgery; attending physician Dr. V. Verma"
              className="w-full p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="py-3 px-6 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-2"
            >
              {submitting ? 'Registering & Finding Results...' : 'Confirm & View Verified Results'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Verified Results (Blood Banks & Eligible Donors) */}
      {currentStep === 3 && createdRequest && (
        <div className="space-y-6">
          {/* Header Summary Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center text-xs">
                  {createdRequest.blood_group}
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {createdRequest.patient_name} • {createdRequest.units_needed} {createdRequest.units_needed > 1 ? 'Units' : 'Unit'}
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {createdRequest.hospital_name}, {createdRequest.city}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDispatchWhatsApp}
                disabled={dispatchingWa || candidates.length === 0}
                className="py-2.5 px-5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow transition-all flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {dispatchingWa ? 'Dispatching Alerts...' : `Send WhatsApp Alerts (${candidates.length})`}
              </button>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Matched Donors */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-600" />
                    Consenting Donors ({candidates.length})
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Radius:</span>
                    <select
                      value={radiusKm}
                      onChange={(e) => {
                        const r = parseInt(e.target.value, 10);
                        setRadiusKm(r);
                        fetchResults(createdRequest.id, r, createdRequest.city);
                      }}
                      className="px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-rose-600 text-xs"
                    >
                      <option value={15}>15 km</option>
                      <option value={30}>30 km</option>
                      <option value={50}>50 km</option>
                    </select>
                  </div>
                </div>

                {resultsLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Scanning spatial index & evaluating 3-month cooldown rules...
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 space-y-3">
                    <p>No available voluntary donors matching ABO/Rh criteria within {radiusKm} km.</p>
                    <button
                      onClick={() => {
                        setRadiusKm(50);
                        fetchResults(createdRequest.id, 50, createdRequest.city);
                      }}
                      className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl"
                    >
                      Expand Radius to 50 km
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {candidates.map((cand, idx) => (
                      <div
                        key={cand.donor_id || idx}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center text-xs">
                              {cand.blood_group}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{cand.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {cand.city} • <span className="font-semibold text-rose-600">{cand.distance_band}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedDonorForCall(cand)}
                          className="py-1.5 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Contact</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Verified Regional Blood Banks */}
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  Verified Blood Centres in {createdRequest.city}
                </h3>

                <div className="space-y-3 text-xs">
                  {bloodBanks.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No blood centres listed for this district.</p>
                  ) : (
                    bloodBanks.map((bb) => (
                      <div key={bb.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <strong className="block text-slate-900">{bb.name}</strong>
                        <p className="text-slate-500 text-[11px]">{bb.address}</p>
                        <a
                          href={`tel:${bb.phone}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 pt-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{bb.phone}</span>
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              &larr; Back to Patient Details
            </button>

            <button
              onClick={handleDispatchWhatsApp}
              disabled={dispatchingWa}
              className="py-3 px-6 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>Proceed to Request Coordination</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Request Coordination & WhatsApp Tracking */}
      {currentStep === 4 && createdRequest && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Active Coordination Session
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                WhatsApp Emergency Alerts Dispatched
              </h2>
            </div>

            <button
              onClick={() => navigate(`/requests/${createdRequest.id}`)}
              className="py-2 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Track in Full Dashboard &rarr;
            </button>
          </div>

          {/* WhatsApp Alert Status Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2 text-xs text-emerald-900">
            <h3 className="font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Notifications Queued ({waResult?.dispatched_count || candidates.length} Donors)
            </h3>
            <p className="leading-relaxed text-emerald-800">
              Approved WhatsApp notification templates containing tokenized response links have been generated and queued. Donors can accept, decline, or mark unavailable directly through WhatsApp without creating an account.
            </p>
          </div>

          {/* Manual WhatsApp Fallback */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900">Manual WhatsApp Deep-Link Fallback</h4>
            <p className="text-slate-600 leading-relaxed">
              If you wish to message friends, family, or hospital coordinators directly, use this prefilled emergency message:
            </p>
            <div className="pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `URGENT: Blood requirement for ${createdRequest.patient_name}.\nBlood Group: ${createdRequest.blood_group}\nUnits: ${createdRequest.units_needed}\nHospital: ${createdRequest.hospital_name}, ${createdRequest.city}\nContact: ${contactPhone || '+91 98765 00000'}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Prefilled WhatsApp Broadcast</span>
              </a>
            </div>
          </div>

          <div className="pt-2 flex justify-between">
            <button
              onClick={() => setCurrentStep(3)}
              className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              &larr; View Candidate Donors
            </button>
            <button
              onClick={() => navigate('/requester/dashboard')}
              className="py-2.5 px-5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md"
            >
              Go to Requester Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Contact Donor Modal */}
      {selectedDonorForCall && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                  Consent-Gated Contact
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Contact {selectedDonorForCall.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDonorForCall(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Blood Group:</span>
                <span className="font-bold text-rose-600">{selectedDonorForCall.blood_group}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Proximity:</span>
                <span className="font-medium text-slate-800">{selectedDonorForCall.distance_band}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono font-bold text-slate-900">{selectedDonorForCall.phone || '+91 98765 00000'}</span>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              <strong>Coordination etiquette:</strong> Please introduce yourself politely, state patient details and hospital name, and verify the donor's current wellness before scheduling travel.
            </div>

            <div className="flex gap-2">
              <a
                href={`tel:${selectedDonorForCall.phone}`}
                className="flex-1 py-2.5 text-xs font-bold text-center text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all"
              >
                Call Now
              </a>
              <button
                onClick={() => setSelectedDonorForCall(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
