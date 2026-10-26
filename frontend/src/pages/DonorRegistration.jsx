import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Calendar, Shield, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DonorRegistration() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [bloodGroup, setBloodGroup] = useState('O+');
  const [city, setCity] = useState('Jaipur');
  const [area, setArea] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [consentToContact, setConsentToContact] = useState(true);
  const [lastDonationDate, setLastDonationDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bloodGroup || !city) {
      setError('Please provide blood group and city.');
      return;
    }

    if (!consentToContact) {
      setError('You must grant consent to be contacted to join the emergency donor coordination network.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.donors.register({
        blood_group: bloodGroup,
        city,
        area,
        postal_code: postalCode,
        consent_to_contact: consentToContact,
        last_donation_date: lastDonationDate || null
      });

      if (res.success) {
        await refreshUser();
        navigate('/donor/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to complete donor registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white mx-auto shadow-md shadow-rose-200">
          <Heart className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Become a Verified Donor</h1>
        <p className="text-xs text-slate-500">Provide approximate details to be matched during urgent blood emergencies</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Select Your Blood Group *</label>
          <div className="grid grid-cols-4 gap-2">
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setBloodGroup(g)}
                className={`py-2.5 text-xs font-extrabold rounded-xl border transition-all ${
                  bloodGroup === g
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">City / Region *</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
            >
              <option value="Jaipur">Jaipur (Rajasthan)</option>
              <option value="Ghaziabad">Ghaziabad (Uttar Pradesh)</option>
              <option value="Delhi">Delhi (NCR)</option>
              <option value="Noida">Noida (Uttar Pradesh)</option>
              <option value="Bengaluru">Bengaluru (Karnataka)</option>
              <option value="Mumbai">Mumbai (Maharashtra)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Approximate Area / Locality</label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Malviya Nagar, Indirapuram"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Last Whole Blood Donation Date (Optional)</label>
          <input
            type="date"
            value={lastDonationDate}
            onChange={(e) => setLastDonationDate(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-700"
          />
        </div>

        {/* Consent Checkbox */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentToContact}
              onChange={(e) => setConsentToContact(e.target.checked)}
              className="mt-1 w-4 h-4 accent-rose-600 rounded cursor-pointer"
            />
            <span className="text-xs text-slate-700 leading-relaxed font-medium">
              I give explicit consent to be contacted through BloodBridge for emergency blood coordination. I understand that I can withdraw this consent at any time from my donor portal.
            </span>
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Registering Donor Profile...' : 'Complete Donor Registration'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
