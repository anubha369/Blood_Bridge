import React, { useState } from 'react';
import { Heart, CheckCircle2, XCircle, Clock, AlertCircle, HelpCircle, Shield, Droplet, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BloodDonationInfo() {
  const [activeTab, setActiveTab] = useState('eligibility');

  const mythsAndFacts = [
    {
      myth: "Donating blood makes you weak and takes weeks to recover.",
      fact: "The human body replenishes fluid plasma within 24 to 48 hours, and red blood cells are restored within several weeks. Most healthy donors resume normal light activities immediately after juice and rest."
    },
    {
      myth: "You can contract HIV or hepatitis by donating blood.",
      fact: "Impossible. A brand new, sterile, disposable needle and bag are used for each donor and immediately discarded. There is zero risk of infection to the donor."
    },
    {
      myth: "People with diabetes or high blood pressure can never donate blood.",
      fact: "Individuals with well-controlled hypertension or type-2 diabetes on oral medication can donate provided their vitals fall within NBTC medical limits on the day of donation."
    },
    {
      myth: "Vegetarians have lower hemoglobin and cannot donate blood.",
      fact: "Dietary habits do not prevent blood donation. As long as hemoglobin levels meet the minimum threshold of 12.5 g/dL, any vegetarian or vegan is eligible."
    },
    {
      myth: "Donating blood is extremely painful.",
      fact: "Donors feel a slight pinch for a second when the sterile needle is inserted. The actual donation takes only 8 to 10 minutes."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-semibold">
          <Droplet className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
          <span>Approved Medical Guidance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Blood Donation Guide & Eligibility Standards
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Based on the National Blood Transfusion Council (NBTC), Directorate General of Health Services (DGHS), Ministry of Health & Family Welfare, and WHO standards.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('eligibility')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'eligibility'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Eligibility Criteria
          </button>
          <button
            onClick={() => setActiveTab('intervals')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'intervals'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Donation Intervals
          </button>
          <button
            onClick={() => setActiveTab('myths')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'myths'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Myths vs. Facts
          </button>
          <button
            onClick={() => setActiveTab('care')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'care'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            Pre & Post Care
          </button>
        </div>
      </div>

      {/* Content 1: Eligibility */}
      {activeTab === 'eligibility' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Who Can Donate */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                General Donor Requirements (NBTC)
              </h3>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-24">Age:</span>
                  <span>18 to 65 years (regular donors up to 65 at medical discretion)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-24">Weight:</span>
                  <span>Minimum 45 kg (for 350 ml whole blood); 50 kg for 450 ml</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-24">Hemoglobin:</span>
                  <span>Minimum 12.5 g/dL (tested on-site prior to donation)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-24">Pulse & BP:</span>
                  <span>Pulse 60-100 bpm regular; Systolic 100-140 mmHg, Diastolic 60-90 mmHg</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-24">Temperature:</span>
                  <span>Normal body temperature (afebrile, &le; 37.5°C / 99.5°F)</span>
                </li>
              </ul>
            </div>

            {/* Who Must Defer */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Temporary Deferrals (NBTC Protocols)
              </h3>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-24">Tattoo/Piercing:</span>
                  <span>Defer for 6 to 12 months after procedure</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-24">Antibiotics/Fever:</span>
                  <span>Defer until 7-14 days after completing medication and full recovery</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-24">Major Surgery:</span>
                  <span>Defer for 6 to 12 months depending on clinical recovery</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-24">Alcohol Intake:</span>
                  <span>Avoid alcohol consumption for at least 24 hours prior to donation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-24">Pregnancy:</span>
                  <span>Defer during pregnancy and for 12 months post-delivery / lactation</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs text-rose-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>
              <strong>Permanent Deferral:</strong> Individuals with HIV/AIDS, Hepatitis B or C, chronic cardiac disorders, or active malignancy are permanently ineligible to donate blood under national safety laws.
            </span>
          </div>
        </div>
      )}

      {/* Content 2: Intervals */}
      {activeTab === 'intervals' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <Droplet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Whole Blood</h3>
            <p className="text-2xl font-black text-rose-600">90 Days (Men)<br /><span className="text-lg text-slate-700">120 Days (Women)</span></p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Standard 350ml or 450ml donation. Male donors can donate once every 3 months; female donors once every 4 months to protect iron stores.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Platelets (Apheresis)</h3>
            <p className="text-2xl font-black text-amber-600">48 Hours<br /><span className="text-lg text-slate-700">Max 24 times / yr</span></p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Single Donor Platelet (SDP) apheresis collects platelets while returning red blood cells to the donor. Minimum 48 hours interval between sessions.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Plasma (Apheresis)</h3>
            <p className="text-2xl font-black text-indigo-600">14 Days<br /><span className="text-lg text-slate-700">Max 12 litres / yr</span></p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Plasma proteins regenerate swiftly. Donors can safely give plasma every two weeks under apheresis protocols monitored by certified blood centres.
            </p>
          </div>
        </div>
      )}

      {/* Content 3: Myths & Facts */}
      {activeTab === 'myths' && (
        <div className="space-y-4">
          {mythsAndFacts.map((item, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-start gap-2 text-rose-700 text-xs font-bold">
                <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>Myth: "{item.myth}"</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700 text-xs leading-relaxed pl-6">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong className="text-emerald-700">Medical Fact:</strong> {item.fact}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content 4: Pre & Post Care */}
      {activeTab === 'care' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-600" />
              Before You Donate (Preparation)
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Drink at least 500ml of water or fresh fruit juice 15-30 minutes before donation.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Eat a nutritious meal 2-3 hours prior; avoid fatty foods or fasting on donation day.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Get a good night's rest (at least 6-7 hours of undisturbed sleep).</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Do not consume alcohol or smoke for at least 24 hours and 2 hours respectively.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              After You Donate (Recovery)
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>Rest in the observation area for 10-15 minutes and enjoy provided snacks and fluids.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>Keep the bandage on for at least 4 hours; keep the area clean and dry.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>Avoid heavy lifting, intense workouts, or driving long distances for the next 24 hours.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>Drink extra fluids throughout the day to replenish plasma volume rapidly.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* CTA Box */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold">Ready to register as a voluntary lifesaver in Uttar Pradesh?</h4>
          <p className="text-xs text-slate-400">Join our privacy-protected network of verified blood donors.</p>
        </div>
        <Link
          to="/donor/registration"
          className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md shadow-rose-900"
        >
          Register as Donor
        </Link>
      </div>
    </div>
  );
}
