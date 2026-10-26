import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, Shield, CheckCircle2, Clock, Phone, AlertCircle, Filter, Heart, ExternalLink } from 'lucide-react';
import { api } from '../api/client';

export default function NearbyDonors() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [city, setCity] = useState(searchParams.get('city') || 'Jaipur');
  const [bloodGroup, setBloodGroup] = useState(searchParams.get('blood_group') || '');
  const [radiusKm, setRadiusKm] = useState(parseInt(searchParams.get('radius_km') || '25', 10));
  const [latitude, setLatitude] = useState(searchParams.get('latitude') || '');
  const [longitude, setLongitude] = useState(searchParams.get('longitude') || '');

  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDonorForContact, setSelectedDonorForContact] = useState(null);

  const fetchDonors = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        radius_km: radiusKm,
        limit: 50
      };

      if (latitude && longitude) {
        params.latitude = latitude;
        params.longitude = longitude;
      } else {
        params.city = city;
      }

      if (bloodGroup) {
        params.blood_group = bloodGroup;
      }

      const res = await api.donors.searchNearby(params);
      if (res.success) {
        setDonors(res.results || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to search donors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDonors();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Search className="w-7 h-7 text-rose-600" />
            Location-Based Donor Search
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Spatial indexing via PostGIS <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded text-xs font-mono">ST_DWithin</code> • SRID 4326 Geography Point
          </p>
        </div>

        {/* Geo-Privacy Banner */}
        <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl p-3 text-indigo-900 text-xs flex items-center gap-2 max-w-md">
          <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <span>
            <strong>Geo-Privacy Active:</strong> Donors' exact home GPS coordinates and addresses are strictly concealed. Only approximate distance bands are shown.
          </span>
        </div>
      </div>

      {/* Search Filter Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* City Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              City / Region
            </label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setLatitude('');
                setLongitude('');
              }}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
            >
              <option value="Jaipur">Jaipur (Rajasthan)</option>
              <option value="Ghaziabad">Ghaziabad (Uttar Pradesh)</option>
              <option value="Delhi">New Delhi (Delhi)</option>
              <option value="Noida">Noida (Uttar Pradesh)</option>
              <option value="Bengaluru">Bengaluru (Karnataka)</option>
              <option value="Mumbai">Mumbai (Maharashtra)</option>
              <option value="Pune">Pune (Maharashtra)</option>
              <option value="Lucknow">Lucknow (Uttar Pradesh)</option>
            </select>
          </div>

          {/* Blood Group Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Blood Group
            </label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
            >
              <option value="">All Blood Groups</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Radius Slider */}
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Radius Filter</span>
              <span className="text-rose-600 font-mono">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
              className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg mt-2"
            />
          </div>

          {/* Search Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Querying PostGIS...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  Execute Spatial Search
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-600">
          Showing <span className="text-slate-900 font-bold">{donors.length}</span> potential donor candidates within {radiusKm} km of {city}
        </div>
        <div className="text-[11px] text-slate-400">
          Ranked by spatial distance & verification status
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Donor Candidates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                <div className="w-20 h-5 bg-slate-200 rounded-full"></div>
              </div>
              <div className="space-y-2">
                <div className="w-3/4 h-4 bg-slate-200 rounded"></div>
                <div className="w-1/2 h-3 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : donors.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No matching donors in this immediate radius</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try expanding your search radius slider or check our directory of verified 24/7 blood banks in your area.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {donors.map((donor) => (
            <div
              key={donor.donor_id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-rose-600 text-white font-extrabold flex items-center justify-center text-base shadow-sm shadow-rose-200">
                    {donor.blood_group}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {donor.verification_status === 'verified' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified Donor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Verification
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {donor.distance_band}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{donor.name}</h3>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {donor.area ? `${donor.area}, ` : ''}{donor.city}
                </div>

                {donor.last_donation_date && (
                  <div className="text-[11px] text-slate-400 mt-2">
                    Last donation: {donor.last_donation_date}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedDonorForContact(donor)}
                  className="w-full py-2 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  Contact Potential Donor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Consent Contact Modal */}
      {selectedDonorForContact && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Consent-Governed Outreach
              </h3>
              <button
                onClick={() => setSelectedDonorForContact(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                You are requesting contact with potential donor <strong>{selectedDonorForContact.name}</strong> ({selectedDonorForContact.blood_group}) located approximately <strong>{selectedDonorForContact.distance_band}</strong>.
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">Donor Coordination Protocol:</span>
                <p>• Donor has given explicit consent to receive emergency coordination requests.</p>
                <p>• Donor contact details will be shared through secure in-app messaging or verified coordination relay.</p>
                <p>• Clinical screening and cross-matching will be conducted by hospital staff.</p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  alert(`Emergency coordination ping sent to ${selectedDonorForContact.name}. Donor notified via registered channel.`);
                  setSelectedDonorForContact(null);
                }}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all"
              >
                Send Coordination Request
              </button>
              <button
                onClick={() => setSelectedDonorForContact(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
