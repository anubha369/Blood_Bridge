import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Search,
  X,
  Loader2,
  Edit3,
  Navigation
} from 'lucide-react';
import { api } from '../api/client';

export default function CreateRequest() {
  const navigate = useNavigate();

  // 4-Step Wizard State: 1 = Requirement, 2 = Patient Details, 3 = Results, 4 = Coordination
  const [currentStep, setCurrentStep] = useState(1);

  // Natural Language Auto-Fill / Assistant State
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Need 2 units of B+ blood urgently at Max Hospital Vaishali Ghaziabad tomorrow morning');
  const [parsingAI, setParsingAI] = useState(false);

  // Step 1: Blood Requirement Fields
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [unitsNeeded, setUnitsNeeded] = useState(1);
  const [city, setCity] = useState('Ghaziabad');
  const [hospitalName, setHospitalName] = useState('');
  const [urgency, setUrgency] = useState('urgent');
  const [contactPhone, setContactPhone] = useState('');

  // Location Autocomplete State
  const [locationQuery, setLocationQuery] = useState('Ghaziabad');
  const [locationCoords, setLocationCoords] = useState({ lat: 28.6692, lon: 77.4538 }); // Default Ghaziabad
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDropdownRef = useRef(null);

  // Hospital Places Autocomplete State
  const [selectedHospitalPlace, setSelectedHospitalPlace] = useState(null);
  const [placeId, setPlaceId] = useState('');
  const [hospitalLat, setHospitalLat] = useState(null);
  const [hospitalLng, setHospitalLng] = useState(null);
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [hospitalSuggestions, setHospitalSuggestions] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const [manualHospitalEntry, setManualHospitalEntry] = useState(false);
  const [hospitalSessionToken, setHospitalSessionToken] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `session_${Math.random().toString(36).substring(2)}_${Date.now()}`
  );
  const [placesConfig, setPlacesConfig] = useState(null);
  const [highlightedHospitalIndex, setHighlightedHospitalIndex] = useState(-1);
  const hospitalDropdownRef = useRef(null);

  // Step 2: Patient & Location Details
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [wardBed, setWardBed] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [description, setDescription] = useState('');

  // Step 3 & 4: Persistence, Search Results & Coordination
  const [createdRequest, setCreatedRequest] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [bloodBanks, setBloodBanks] = useState([]);
  const [radiusKm, setRadiusKm] = useState(30);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Step 4: Telegram Coordination State
  const [dispatchingTg, setDispatchingTg] = useState(false);
  const [tgResult, setTgResult] = useState(null);
  const [contactedDonorIds, setContactedDonorIds] = useState(new Set());
  const [sendingToDonorId, setSendingToDonorId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const [locations, setLocations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load backend locations & places config
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [locRes, configRes] = await Promise.all([
          api.donors.getLocations().catch(() => null),
          api.places.getConfig().catch(() => null)
        ]);
        if (locRes && locRes.success && locRes.locations) {
          setLocations(locRes.locations);
        }
        if (configRes && configRes.success) {
          setPlacesConfig(configRes);
        }
      } catch (err) {
        // Fallback silently
      }
    }
    loadInitialData();
  }, []);

  // Click-outside listener for autocomplete dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (hospitalDropdownRef.current && !hospitalDropdownRef.current.contains(event.target)) {
        setShowHospitalDropdown(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced location search
  useEffect(() => {
    if (!showLocationDropdown || !locationQuery || locationQuery.trim().length < 2) {
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingLocations(true);
      try {
        const res = await api.places.searchLocations({
          input: locationQuery.trim(),
          session_token: hospitalSessionToken
        });
        if (res && res.success) {
          setLocationSuggestions(res.suggestions || []);
        }
      } catch (err) {
        console.warn('Location search failed:', err);
      } finally {
        setLoadingLocations(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [locationQuery, showLocationDropdown, hospitalSessionToken]);

  // Debounced hospital search
  const fetchHospitals = async (query, currentCity, coords) => {
    setLoadingHospitals(true);
    try {
      const res = await api.places.searchHospitals({
        input: query || '',
        city: currentCity || city,
        latitude: coords?.lat ?? locationCoords?.lat,
        longitude: coords?.lon ?? locationCoords?.lon,
        session_token: hospitalSessionToken
      });
      if (res && res.success) {
        setHospitalSuggestions(res.suggestions || []);
      }
    } catch (err) {
      console.warn('Hospital search failed:', err);
    } finally {
      setLoadingHospitals(false);
    }
  };

  useEffect(() => {
    if (!showHospitalDropdown || manualHospitalEntry) return;

    const timer = setTimeout(() => {
      fetchHospitals(hospitalQuery, city, locationCoords);
    }, 300);

    return () => clearTimeout(timer);
  }, [hospitalQuery, city, locationCoords, showHospitalDropdown, manualHospitalEntry]);

  // Handler for selecting a city / locality
  const handleSelectLocation = (loc) => {
    const chosenCity = loc.city || loc.name;
    setCity(chosenCity);
    setLocationQuery(loc.full_name || loc.name);
    const coords = loc.latitude && loc.longitude ? { lat: loc.latitude, lon: loc.longitude } : null;
    if (coords) {
      setLocationCoords(coords);
    }
    setShowLocationDropdown(false);

    // If hospital was previously selected from another city, reset it
    if (selectedHospitalPlace && selectedHospitalPlace.city && selectedHospitalPlace.city !== chosenCity) {
      setSelectedHospitalPlace(null);
      setHospitalName('');
      setPlaceId('');
      setHospitalAddress('');
      setHospitalLat(null);
      setHospitalLng(null);
      setHospitalQuery('');
    }

    // Refresh hospital suggestions for the new location
    fetchHospitals('', chosenCity, coords);
  };

  // Handler for selecting a hospital from autocomplete
  const handleSelectHospital = (hosp) => {
    setHospitalName(hosp.name);
    setPlaceId(hosp.place_id || '');
    const addr = hosp.address || hosp.full_text || '';
    setHospitalAddress(addr);
    setHospitalLat(hosp.latitude || null);
    setHospitalLng(hosp.longitude || null);
    setSelectedHospitalPlace(hosp);
    setHospitalQuery(hosp.name);
    setShowHospitalDropdown(false);
    setManualHospitalEntry(false);
    setError(null);
  };

  // Handler for clearing selected hospital
  const handleClearSelectedHospital = () => {
    setSelectedHospitalPlace(null);
    setPlaceId('');
    setHospitalName('');
    setHospitalQuery('');
    setHospitalLat(null);
    setHospitalLng(null);
    setHospitalAddress('');
    setShowHospitalDropdown(true);
    fetchHospitals('', city, locationCoords);
  };

  // Handler for using custom hospital name if not found in Places
  const handleUseCustomHospitalName = (customName) => {
    const trimmed = (customName || hospitalQuery).trim();
    if (!trimmed) return;
    setHospitalName(trimmed);
    setSelectedHospitalPlace(null);
    setPlaceId('');
    setHospitalLat(locationCoords?.lat || null);
    setHospitalLng(locationCoords?.lon || null);
    setShowHospitalDropdown(false);
    setManualHospitalEntry(true);
  };

  // Keyboard navigation inside hospital dropdown
  const handleHospitalKeyDown = (e) => {
    if (!showHospitalDropdown || hospitalSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedHospitalIndex((prev) => (prev + 1) % hospitalSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedHospitalIndex((prev) => (prev - 1 + hospitalSuggestions.length) % hospitalSuggestions.length);
    } else if (e.key === 'Enter') {
      if (highlightedHospitalIndex >= 0 && highlightedHospitalIndex < hospitalSuggestions.length) {
        e.preventDefault();
        handleSelectHospital(hospitalSuggestions[highlightedHospitalIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowHospitalDropdown(false);
    }
  };

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
        if (p.hospital_name && p.hospital_name !== 'City Emergency Hospital') {
          setHospitalName(p.hospital_name);
          setHospitalQuery(p.hospital_name);
        }
        if (p.location?.city) {
          setCity(p.location.city);
          setLocationQuery(p.location.city);
        }
        if (p.urgency) setUrgency(p.urgency);
        if (p.needed_by) setNeededBy(p.needed_by);
        setShowAiAssistant(false);
        // Automatically search hospital based on AI parsed text
        if (p.hospital_name) {
          setShowHospitalDropdown(true);
          fetchHospitals(p.hospital_name, p.location?.city || city, locationCoords);
        }
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
      setError('Please provide blood group, units, city/location, and hospital name.');
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
      let finalAddress = hospitalAddress ? hospitalAddress.trim() : null;
      if (wardBed.trim()) {
        finalAddress = finalAddress ? `${finalAddress} • Ward/Bed: ${wardBed.trim()}` : `Ward/Bed: ${wardBed.trim()}`;
      }

      const payload = {
        patient_name: patientName.trim(),
        blood_group: bloodGroup,
        units_needed: parseInt(unitsNeeded, 10),
        hospital_name: hospitalName.trim(),
        hospital_address: finalAddress,
        city: city.trim(),
        urgency,
        needed_by: neededBy || null,
        description: description ? description.trim() : null,
        contact_phone: contactPhone ? contactPhone.trim() : null,
        place_id: placeId || null,
        latitude: hospitalLat || (locationCoords ? locationCoords.lat : null),
        longitude: hospitalLng || (locationCoords ? locationCoords.lon : null),
        hospital_place_metadata: selectedHospitalPlace ? {
          place_id: placeId,
          name: hospitalName,
          formatted_address: selectedHospitalPlace.address || hospitalAddress,
          city: city,
          latitude: hospitalLat,
          longitude: hospitalLng,
          types: selectedHospitalPlace.types || []
        } : null
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

  // Step 4: Dispatch Telegram Emergency Notification Requests
  const handleDispatchTelegram = async () => {
    if (!createdRequest) return;
    setDispatchingTg(true);
    try {
      const res = await api.telegram.sendRequestNotifications({
        request_id: createdRequest.id,
        radius_km: radiusKm,
        max_recipients: 10
      });
      if (res.success) {
        setTgResult(res);
        // Mark all candidate IDs as contacted
        const ids = new Set(candidates.map((c) => c.donor_id));
        setContactedDonorIds(ids);
        setCurrentStep(4);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch Telegram notifications.');
    } finally {
      setDispatchingTg(false);
    }
  };

  // Send Telegram contact request to a single matched candidate
  const handleSendSingleTelegramRequest = async (donor) => {
    if (!createdRequest) return;
    setSendingToDonorId(donor.donor_id);
    try {
      const res = await api.requests.sendDonorRequest(createdRequest.id, donor.donor_id);
      if (res.success) {
        setContactedDonorIds((prev) => new Set([...prev, donor.donor_id]));
        showToast(res.message || `Telegram request dispatched to ${donor.name}. Waiting for donor response.`, 'success');
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

  const stepsList = [
    { num: 1, label: 'Blood Requirement' },
    { num: 2, label: 'Patient Details' },
    { num: 3, label: 'Verified Results' },
    { num: 4, label: 'Coordination' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-50 text-rose-700 rounded-full text-xs font-bold tracking-wide uppercase border border-rose-200">
          <Activity className="w-4 h-4 text-rose-600 animate-pulse" />
          <span>Emergency Request Journey</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight">
          Coordinate an Urgent Blood Requirement
        </h1>
        <p className="text-[17px] text-slate-600 max-w-xl mx-auto leading-relaxed">
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

          <form onSubmit={handleStep1Next} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-[20px] font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Step 1: Blood Requirement Details
            </h2>

            <div>
              <label className="block text-[17px] font-semibold text-slate-800 mb-2">Required Blood Group *</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setBloodGroup(grp)}
                    className={`py-3 text-[17px] font-black rounded-xl border transition-all ${
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
                <label className="block text-[17px] font-semibold text-slate-800 mb-1.5">Units Needed (Bags / Pints) *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={unitsNeeded}
                  onChange={(e) => setUnitsNeeded(e.target.value)}
                  className="w-full px-4 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[17px] font-semibold text-slate-800 mb-1.5">Urgency Level *</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full px-4 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="emergency">Critical Emergency (Immediate)</option>
                  <option value="urgent">Urgent (Within 24 Hours)</option>
                  <option value="scheduled">Scheduled Procedure</option>
                </select>
              </div>
            </div>

            {/* Location & Hospital Selection */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {/* 1. Location Field with Autocomplete */}
                <div className="relative" ref={locationDropdownRef}>
                  <label className="block text-[17px] font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      <span>City / Location *</span>
                    </span>
                    {locationCoords && (
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        {locationCoords.lat.toFixed(2)}°, {locationCoords.lon.toFixed(2)}°
                      </span>
                    )}
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={locationQuery}
                      onChange={(e) => {
                        setLocationQuery(e.target.value);
                        setShowLocationDropdown(true);
                      }}
                      onFocus={() => {
                        setShowLocationDropdown(true);
                      }}
                      placeholder="e.g. Ghaziabad, Noida, Delhi..."
                      className="w-full pl-10 pr-10 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {loadingLocations ? (
                      <Loader2 className="w-4 h-4 text-rose-500 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                    ) : locationQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationQuery('');
                          setLocationSuggestions([]);
                        }}
                        className="text-slate-400 hover:text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>

                  {/* Location Suggestions Dropdown */}
                  {showLocationDropdown && (
                    <div className="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        <span>Select City / Area</span>
                        <span className="text-[10px] text-slate-400">Refines nearby hospitals</span>
                      </div>
                      {locationSuggestions.length > 0 ? (
                        locationSuggestions.map((loc, idx) => (
                          <button
                            key={loc.place_id || loc.id || `${loc.name}_${idx}`}
                            type="button"
                            onClick={() => handleSelectLocation(loc)}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-rose-50 flex items-start gap-2.5 border-b border-slate-50 last:border-0 transition-colors"
                          >
                            <MapPin className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-800">
                                {loc.name}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {loc.full_name || loc.state || ''}
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          {loadingLocations ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                              <span>Searching locations...</span>
                            </span>
                          ) : (
                            <span>Type to search Indian cities and districts</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Select Location Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] font-medium text-slate-400 mr-1">Quick select:</span>
                    {['Ghaziabad', 'Noida', 'Delhi', 'Lucknow', 'Jaipur'].map((quickCity) => (
                      <button
                        key={quickCity}
                        type="button"
                        onClick={() => {
                          const coordsMap = {
                            Ghaziabad: { lat: 28.6692, lon: 77.4538 },
                            Noida: { lat: 28.5355, lon: 77.3910 },
                            Delhi: { lat: 28.6139, lon: 77.2090 },
                            Lucknow: { lat: 26.8467, lon: 80.9462 },
                            Jaipur: { lat: 26.9124, lon: 75.7873 }
                          };
                          handleSelectLocation({
                            name: quickCity,
                            city: quickCity,
                            full_name: `${quickCity}, India`,
                            latitude: coordsMap[quickCity]?.lat,
                            longitude: coordsMap[quickCity]?.lon
                          });
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all ${
                          city === quickCity
                            ? 'bg-rose-100/70 border-rose-300 text-rose-800 shadow-sm'
                            : 'bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {quickCity}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Hospital Name Field with Autocomplete or Manual Input */}
                <div className="relative" ref={hospitalDropdownRef}>
                  <label className="block text-[17px] font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-600" />
                      <span>Hospital or Blood Bank *</span>
                    </span>
                    {!manualHospitalEntry && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualHospitalEntry(true);
                          setShowHospitalDropdown(false);
                        }}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
                      >
                        Enter manually
                      </button>
                    )}
                  </label>

                  {/* Case A: Hospital already selected from places */}
                  {selectedHospitalPlace && !manualHospitalEntry ? (
                    <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl relative space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-sm font-extrabold text-slate-900 leading-snug">
                            {selectedHospitalPlace.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearSelectedHospital}
                          title="Change hospital"
                          className="px-2 py-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-100 rounded-lg flex items-center gap-1 hover:bg-rose-200 transition-colors flex-shrink-0"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                      </div>

                      <div className="flex items-start gap-1.5 text-xs text-slate-600 pl-8">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2 leading-relaxed">
                          {selectedHospitalPlace.address || selectedHospitalPlace.full_text || hospitalAddress}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pl-8 pt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified Place
                        </span>
                        {placeId && (
                          <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            ID: {placeId.slice(0, 16)}...
                          </span>
                        )}
                        {hospitalLat && hospitalLng && (
                          <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {hospitalLat.toFixed(3)}°N, {hospitalLng.toFixed(3)}°E
                          </span>
                        )}
                      </div>
                    </div>
                  ) : manualHospitalEntry ? (
                    /* Case B: Manual Hospital Entry */
                    <div className="space-y-1.5">
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={hospitalName}
                          onChange={(e) => setHospitalName(e.target.value)}
                          placeholder="e.g. District Civil Hospital"
                          className="w-full px-4 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setManualHospitalEntry(false);
                            setShowHospitalDropdown(true);
                            fetchHospitals(hospitalName, city, locationCoords);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1"
                        >
                          <Search className="w-3 h-3" />
                          <span>Autocomplete</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Manual mode active. Please ensure the hospital name is accurate.</span>
                      </p>
                    </div>
                  ) : (
                    /* Case C: Searchable Dropdown Input */
                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={hospitalQuery}
                          onChange={(e) => {
                            setHospitalQuery(e.target.value);
                            setHospitalName(e.target.value);
                            setShowHospitalDropdown(true);
                            setHighlightedHospitalIndex(-1);
                          }}
                          onFocus={() => {
                            setShowHospitalDropdown(true);
                            if (hospitalSuggestions.length === 0) {
                              fetchHospitals(hospitalQuery, city, locationCoords);
                            }
                          }}
                          onKeyDown={handleHospitalKeyDown}
                          placeholder={`Search hospital in ${city || 'area'}...`}
                          className="w-full pl-10 pr-10 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                        />
                        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        {loadingHospitals ? (
                          <Loader2 className="w-4 h-4 text-rose-500 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                        ) : hospitalQuery ? (
                          <button
                            type="button"
                            onClick={() => {
                              setHospitalQuery('');
                              setHospitalName('');
                            }}
                            className="text-slate-400 hover:text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>

                      {/* Hospital Suggestions Dropdown Menu */}
                      {showHospitalDropdown && (
                        <div className="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
                          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <span>
                              {hospitalQuery ? `Matching Hospitals in ${city}` : `Suggested Hospitals in ${city}`}
                            </span>
                            <span className="text-[10px] text-rose-600">
                              {hospitalSuggestions.length} available
                            </span>
                          </div>

                          {hospitalSuggestions.length > 0 ? (
                            <div>
                              {hospitalSuggestions.map((hosp, idx) => {
                                const isHighlighted = highlightedHospitalIndex === idx;
                                return (
                                  <button
                                    key={hosp.place_id || `${hosp.name}_${idx}`}
                                    type="button"
                                    onClick={() => handleSelectHospital(hosp)}
                                    onMouseEnter={() => setHighlightedHospitalIndex(idx)}
                                    className={`w-full px-3.5 py-3 text-left flex items-start gap-3 border-b border-slate-100 last:border-0 transition-colors ${
                                      isHighlighted ? 'bg-rose-50/80 text-rose-900' : 'hover:bg-slate-50 text-slate-800'
                                    }`}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <Building2 className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-bold leading-snug">
                                        {hosp.name}
                                      </div>
                                      <div className="text-xs text-slate-500 truncate mt-0.5">
                                        {hosp.address || hosp.full_text || hosp.city}
                                      </div>
                                      {hosp.types && hosp.types.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {hosp.types.slice(0, 2).map((t) => (
                                            <span
                                              key={t}
                                              className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium capitalize"
                                            >
                                              {t.replace(/_/g, ' ')}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 self-center flex-shrink-0" />
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            /* Empty State */
                            <div className="p-4 text-center space-y-3">
                              <p className="text-xs text-slate-600 leading-relaxed">
                                No hospitals found matching &ldquo;<span className="font-bold text-slate-800">{hospitalQuery}</span>&rdquo; in {city}.
                              </p>
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUseCustomHospitalName(hospitalQuery)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                                >
                                  Use &ldquo;{hospitalQuery}&rdquo; as hospital name
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualHospitalEntry(true);
                                    setShowHospitalDropdown(false);
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                                >
                                  Enter manually
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Dropdown Footer Fallback */}
                          <div className="px-3.5 py-2.5 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                            <span>Can&apos;t find your hospital?</span>
                            <button
                              type="button"
                              onClick={() => {
                                setManualHospitalEntry(true);
                                setShowHospitalDropdown(false);
                              }}
                              className="font-bold text-rose-600 hover:text-rose-700 underline"
                            >
                              Enter manually &rarr;
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Provider Info Pill */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>
                      {placesConfig?.configured
                        ? '⚡ Powered by Google Places API (New)'
                        : '📍 National Healthcare Directory (India)'}
                    </span>
                    {!manualHospitalEntry && (
                      <span className="text-[10px] text-slate-400">
                        Use Arrow keys &amp; Enter to select
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Coordination Disclaimer Notice */}
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900">
                <Shield className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>Coordination Notice:</strong> Hospital suggestions and geographical coordinates are provided for navigation and transit coordination only. BloodBridge does not claim hospitals have verified real-time blood bank inventory.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[17px] font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-slate-500" />
                <span>Requester Contact Phone *</span>
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="py-3.5 px-8 text-[17px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-2"
              >
                <span>Continue to Patient Details</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Patient & Hospital Details */}
      {currentStep === 2 && (
        <form onSubmit={handleStep2Submit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-[20px] font-extrabold uppercase tracking-wider text-slate-900">
              Step 2: Patient &amp; Clinical Context
            </h2>
            <span className="text-[16px] text-rose-600 font-bold">
              {bloodGroup} • {unitsNeeded} {unitsNeeded > 1 ? 'Units' : 'Unit'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[17px] font-semibold text-slate-800 mb-1.5">Patient Full Name *</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Ramesh Chandra"
                className="w-full px-4 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[17px] font-semibold text-slate-800 mb-1.5">Patient Age (Optional)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="e.g. 45"
                className="w-full px-4 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          {/* Hospital Address Context & Specific Ward/Bed */}
          {selectedHospitalPlace ? (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    <span>Verified Hospital Location</span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Places Verified
                  </span>
                </div>
                <div className="text-[16px] font-bold text-slate-900">{hospitalName}</div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  {hospitalAddress || selectedHospitalPlace.address || selectedHospitalPlace.full_text}
                </div>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
                  {placeId && <span>Place ID: {placeId}</span>}
                  {hospitalLat && hospitalLng && (
                    <span>Coords: {hospitalLat.toFixed(4)}°, {hospitalLng.toFixed(4)}°</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[17px] font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>Specific Ward / Floor / Bed / Room (Optional)</span>
                </label>
                <input
                  type="text"
                  value={wardBed}
                  onChange={(e) => setWardBed(e.target.value)}
                  placeholder="e.g. ICU Bed 4, 3rd Floor Emergency Wing"
                  className="w-full px-4 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Verified street address was auto-filled from Places. You only need to add internal room/ward guidance.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[17px] font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>Hospital Address / Location Details</span>
              </label>
              <input
                type="text"
                value={hospitalAddress}
                onChange={(e) => setHospitalAddress(e.target.value)}
                placeholder="e.g. Sector 12, Main Road, Near Metro Station"
                className="w-full px-4 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[17px] font-semibold text-slate-800 mb-1.5">Needed By Date / Time (Optional)</label>
            <input
              type="datetime-local"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
              className="w-full px-4 py-3 text-[17px] bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-[17px] font-semibold text-slate-800 mb-1.5">Additional Medical Coordination Notes</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Replacement donor required for elective CABG surgery; attending physician Dr. V. Verma"
              className="w-full p-4 text-[17px] bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="py-3 px-6 text-[16px] font-bold text-slate-700 hover:text-slate-900 flex items-center gap-2 border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="py-3.5 px-8 text-[17px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Registering & Finding Results...' : 'Confirm & View Verified Results'}</span>
              <ArrowRight className="w-5 h-5" />
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
                onClick={handleDispatchTelegram}
                disabled={dispatchingTg || candidates.length === 0}
                className="py-2.5 px-5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl shadow transition-all flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {dispatchingTg ? 'Dispatching Telegram Alerts...' : `Notify Donors via Telegram (${candidates.length})`}
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

                        {contactedDonorIds.has(cand.donor_id) ? (
                          <span className="py-1.5 px-3 text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 rounded-xl flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-600" />
                            <span>Request Sent</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendSingleTelegramRequest(cand)}
                            disabled={sendingToDonorId === cand.donor_id}
                            className="py-1.5 px-3 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{sendingToDonorId === cand.donor_id ? 'Sending...' : 'Send Telegram Request'}</span>
                          </button>
                        )}
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
              onClick={handleDispatchTelegram}
              disabled={dispatchingTg}
              className="py-3 px-6 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>Dispatch Telegram Emergency Requests</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Telegram Coordination & Response Tracking */}
      {currentStep === 4 && createdRequest && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800">
                <CheckCircle2 className="w-3 h-3 text-sky-600" />
                Telegram Coordination Initiated
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Emergency Requests Dispatched to Verified Donors
              </h2>
            </div>

            <button
              onClick={() => navigate(`/requests/${createdRequest.id}`)}
              className="py-2 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all"
            >
              Track Journey & View Responses &rarr;
            </button>
          </div>

          {/* Telegram Alert Status Box */}
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 space-y-3 text-xs text-sky-950">
            <h3 className="font-bold flex items-center gap-2 text-sky-900">
              <Send className="w-4 h-4 text-sky-600" />
              Telegram Bot Requests Dispatched ({tgResult?.sent_count || contactedDonorIds.size || candidates.length} Donors)
            </h3>
            <p className="leading-relaxed text-sky-900">
              Emergency requests have been sent via the official BloodBridge Telegram bot (<strong>@Blood_Bridgebot</strong>) with interactive <strong>[Accept Request]</strong> and <strong>[Decline Request]</strong> buttons.
            </p>
            <div className="bg-white/80 p-3.5 rounded-xl border border-sky-200/80 space-y-1.5 text-[11px] text-slate-700">
              <p><strong>1. Privacy Shield:</strong> Donor phone numbers and personal contact details are completely concealed at this stage.</p>
              <p><strong>2. Immediate Disclosure Upon Acceptance:</strong> The moment a donor clicks [Accept Request], their verified phone number will be unlocked and displayed on your Request Journey Tracker.</p>
              <p><strong>3. Transparent Status:</strong> You will see live updates (&quot;Waiting for donor response&quot;, &quot;Accepted&quot;, &quot;Declined&quot;).</p>
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
              onClick={() => navigate(`/requests/${createdRequest.id}`)}
              className="py-2.5 px-5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md"
            >
              Go to Request Tracking &rarr;
            </button>
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
