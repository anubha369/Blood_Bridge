import React, { useState, useEffect } from 'react';
import { Building2, Phone, MapPin, Clock, ShieldCheck, Search, AlertTriangle, ExternalLink, Calendar } from 'lucide-react';
import { api } from '../api/client';

export default function BloodBanks() {
  const [bloodBanks, setBloodBanks] = useState([]);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBloodBanks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (city) params.city = city;
      const res = await api.bloodBanks.getAll(params);
      if (res.success) {
        setBloodBanks(res.blood_banks || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load blood banks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBloodBanks();
  }, [city]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-rose-600" />
            Verified Hospital Blood Banks Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official government, Red Cross, and NABH-accredited regional blood transfusion centres
          </p>
        </div>

        {/* City Filter */}
        <div className="w-full sm:w-64">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-semibold text-slate-800 shadow-sm"
          >
            <option value="">All Verified Cities</option>
            <option value="Jaipur">Jaipur (Rajasthan)</option>
            <option value="Ghaziabad">Ghaziabad (Uttar Pradesh)</option>
          </select>
        </div>
      </div>

      {/* Crucial Verification Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold">Live Inventory Confirmation Protocol:</strong>
          <p className="text-amber-800 leading-relaxed">
            Reported inventory units represent the most recent update recorded from health authorities. Emergency patient attendants must call the blood centre's direct telephone line to confirm immediate stock before dispatching a courier or ambulance.
          </p>
        </div>
      </div>

      {/* Blood Banks Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse space-y-4">
              <div className="w-3/4 h-5 bg-slate-200 rounded"></div>
              <div className="w-1/2 h-3 bg-slate-200 rounded"></div>
              <div className="grid grid-cols-4 gap-2 pt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : bloodBanks.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No blood banks found in this city</h3>
          <p className="text-xs text-slate-500">Try selecting "All Verified Cities" to view regional centres.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bloodBanks.map((bank) => (
            <div
              key={bank.id}
              className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mb-1.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Officially Verified Centre
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">{bank.name}</h3>
                  </div>
                  {bank.distance_band && bank.distance_band !== 'Distance not available' && (
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
                      {bank.distance_band}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{bank.address}, {bank.city}, {bank.state} {bank.postal_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-slate-800">{bank.operating_hours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-[11px] text-slate-500">Source: {bank.source_of_info}</span>
                  </div>
                </div>

                {/* Reported Inventory Table */}
                {bank.inventory_summary && (
                  <div className="pt-2">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Latest Reported Stock (Units):</span>
                      <span className="text-[10px] text-slate-400 normal-case">
                        Updated {new Date(bank.last_updated).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {Object.entries(bank.inventory_summary).map(([grp, count]) => (
                        <div
                          key={grp}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center"
                        >
                          <div className="text-[10px] font-bold text-slate-500">{grp}</div>
                          <div className={`text-xs font-extrabold ${count > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <a
                  href={`tel:${bank.phone}`}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call: {bank.phone}
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${bank.name} ${bank.address} ${bank.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Directions
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
