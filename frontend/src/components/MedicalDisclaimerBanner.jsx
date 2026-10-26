import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

export default function MedicalDisclaimerBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside aria-label="Clinical Disclaimer" className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs py-2 px-4 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="font-medium">
            <span className="font-bold">Clinical Coordination Notice:</span> BloodBridge is an emergency coordination and search navigation platform, NOT a medical authority.
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-amber-700 hover:text-amber-950 flex items-center gap-1 font-semibold underline text-[11px] whitespace-nowrap"
        >
          {expanded ? 'Less info' : 'Important clinical details'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-amber-200/80 text-[11px] text-amber-800 leading-relaxed space-y-1">
          <p>
            • Blood group and spatial proximity matching indicates <strong>potential donor candidates</strong>, but <strong>never</strong> represents medical confirmation of compatibility.
          </p>
          <p>
            • Final donor screening, hemoglobin checks, cross-matching, antibody screening, and transfusion safety decisions belong exclusively to authorized blood bank pathologists and attending clinicians.
          </p>
          <p>
            • In extreme acute emergencies, do not delay immediate contact with hospital emergency teams or certified regional blood centres.
          </p>
        </div>
      )}
    </aside>
  );
}
