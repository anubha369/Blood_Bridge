import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Activity, MapPin, Heart, Clock, Phone, AlertCircle, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { api } from '../api/client';

export default function CreateRequest() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'manual'

  // AI Natural Language input
  const [aiPrompt, setAiPrompt] = useState('I need 2 units of B positive blood near Ghaziabad tomorrow morning for surgery');
  const [parsingAI, setParsingAI] = useState(false);
  const [parseResult, setParseResult] = useState(null);

  // Form Fields
  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [unitsNeeded, setUnitsNeeded] = useState(1);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [city, setCity] = useState('Lucknow');
  const [urgency, setUrgency] = useState('urgent');
  const [neededBy, setNeededBy] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [locations, setLocations] = useState([]);

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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleParseWithAI = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setParsingAI(true);
    setError(null);
    try {
      const res = await api.ai.parseRequest(aiPrompt);
      if (res.success && res.parsed_request) {
        const p = res.parsed_request;
        setParseResult(p);

        // Pre-fill form fields
        if (p.blood_group) setBloodGroup(p.blood_group);
        if (p.units_needed) setUnitsNeeded(p.units_needed);
        if (p.hospital_name) setHospitalName(p.hospital_name);
        if (p.location?.city) setCity(p.location.city);
        if (p.urgency) setUrgency(p.urgency);
        if (p.needed_by) setNeededBy(p.needed_by);
        if (p.description) setDescription(p.description);
      }
    } catch (err) {
      setError(err.message || 'Could not parse request with AI.');
    } finally {
      setParsingAI(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!patientName || !hospitalName || !city || !bloodGroup) {
      setError('Please fill all required fields (Patient Name, Hospital, City, Blood Group).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        patient_name: patientName,
        blood_group: bloodGroup,
        units_needed: parseInt(unitsNeeded, 10),
        hospital_name: hospitalName,
        hospital_address: hospitalAddress,
        city,
        urgency,
        needed_by: neededBy,
        description,
        contact_phone: contactPhone
      };

      const res = await api.requests.create(payload);
      if (res.success) {
        if (res.request && res.request.id) {
          navigate(`/requests/${res.request.id}`);
        } else {
          navigate('/requester/dashboard');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to create blood request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Activity className="w-7 h-7 text-rose-600" />
          Create Emergency Blood Request
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Coordinate with verified donors and nearby blood banks within minutes
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'ai'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-rose-500" />
          Natural-Language Smart Assistant
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'manual'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-slate-500" />
          Direct Structured Form
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Extraction Section */}
      {activeTab === 'ai' && (
        <div className="bg-gradient-to-br from-rose-50/70 via-white to-slate-50 p-6 sm:p-8 rounded-3xl border border-rose-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-600" />
              Smart Request Understanding
            </span>
            <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">
              Intelligent Parser
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Type or speak your requirement naturally. Our smart assistant extracts the clinical fields and maps them directly to your request.
          </p>

          <form onSubmit={handleParseWithAI} className="space-y-3">
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. My father needs 2 units of B+ blood urgently at Fortis Hospital Jaipur tomorrow morning..."
              className="w-full p-3.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-inner"
            />

            <button
              type="submit"
              disabled={parsingAI || !aiPrompt.trim()}
              className="py-2.5 px-5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-2"
            >
              {parsingAI ? 'Analyzing Request...' : 'Extract Fields with AI'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Extracted Fields Summary */}
          {parseResult && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 mt-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Structured Fields Extracted (Confidence: {Math.round(parseResult.confidence * 100)}%)
                </span>
                <span className="text-[10px] text-slate-400">Parser: {parseResult.parser}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold block">Blood Group</span>
                  <span className="font-extrabold text-rose-600 text-sm">{parseResult.blood_group || 'Not specified'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold block">Units Needed</span>
                  <span className="font-bold text-slate-800">{parseResult.units_needed}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold block">Detected City</span>
                  <span className="font-bold text-slate-800">{parseResult.location?.city || 'Not specified'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold block">Urgency</span>
                  <span className="font-bold uppercase text-red-600">{parseResult.urgency}</span>
                </div>
              </div>

              {parseResult.missing_fields && parseResult.missing_fields.length > 0 && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  Missing information: {parseResult.missing_fields.join(', ')}. Please verify the form below.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Form Fields */}
      <form onSubmit={handleCreateRequest} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
          Request Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Patient Name *</label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Required Blood Group *</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-rose-600"
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Units Needed (Pints / Bags) *</label>
            <input
              type="number"
              min="1"
              max="20"
              required
              value={unitsNeeded}
              onChange={(e) => setUnitsNeeded(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level *</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold"
            >
              <option value="emergency">Critical Emergency (Immediate)</option>
              <option value="urgent">Urgent (Within 24 Hours)</option>
              <option value="scheduled">Scheduled Procedure</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hospital / Blood Centre Name *</label>
            <input
              type="text"
              required
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              placeholder="e.g. SMS Hospital Emergency Wing"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">City / District *</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
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
                  <option value="Noida">Noida (Uttar Pradesh)</option>
                  <option value="Ghaziabad">Ghaziabad (Uttar Pradesh)</option>
                  <option value="Bareilly">Bareilly (Uttar Pradesh)</option>
                  <option value="Gorakhpur">Gorakhpur (Uttar Pradesh)</option>
                  <option value="Jaipur">Jaipur (Rajasthan)</option>
                  <option value="Delhi">Delhi (NCR)</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hospital Address / Ward</label>
            <input
              type="text"
              value={hospitalAddress}
              onChange={(e) => setHospitalAddress(e.target.value)}
              placeholder="e.g. JLN Marg, Ward 4"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone Number</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Requirement Notes</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Scheduled for cardiac bypass tomorrow at 9 AM. Attendants can accept verified donors at hospital reception."
            className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? 'Registering Request & Matching Donors...' : 'Submit Emergency Request'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
