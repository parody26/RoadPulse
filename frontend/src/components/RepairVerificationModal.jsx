import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, UserCheck, Image, Camera, ZoomIn } from 'lucide-react';
import ImageModal from './ImageModal';

export default function RepairVerificationModal({ incident, onClose, onVerificationSuccess }) {
  const [engineerName, setEngineerName] = useState('Eng. Rajesh Kumar');
  const [notes, setNotes] = useState('Physical inspection conducted on-site. Asphalt patching completed and verified.');
  const [submitting, setSubmitting] = useState(false);
  const [inspectingImage, setInspectingImage] = useState(null);

  if (!incident) return null;

  const beforeImage = incident.evidence && incident.evidence[0] ? incident.evidence[0].image_url : 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60';
  const afterImage = 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop&q=60';

  const handleVerify = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/incidents/${incident.id}/verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified_by: engineerName,
          notes: notes
        })
      });
      const data = await res.json();
      setSubmitting(false);
      if (onVerificationSuccess) await onVerificationSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Stage 8: Human Repair Verification</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Confirm physical repair completion with human sign-off</p>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Incident Summary */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Defect:</span>
            <span className="font-bold text-white">{incident.damage_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Location:</span>
            <span className="text-slate-300">{incident.location_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Coordinates:</span>
            <span className="font-mono text-slate-300">{incident.latitude}, {incident.longitude}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Hazard Priority:</span>
            <span className="font-mono text-cyan-400 font-bold">{incident.risk_score ? `${incident.risk_score} Risk Score` : 'High Priority'}</span>
          </div>
        </div>

        {/* Before / After Evidence Images (Clickable for High-Res Zoom) */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block mb-1">Before (AI Detection)</span>
            <div 
              onClick={() => setInspectingImage(beforeImage)}
              className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-28 flex items-center justify-center relative cursor-pointer group"
              title="Click to zoom image"
            >
              <img
                src={beforeImage}
                alt="Before Repair"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60';
                }}
              />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <ZoomIn className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-semibold block mb-1">After (Repaired Evidence)</span>
            <div 
              onClick={() => setInspectingImage(afterImage)}
              className="rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-950 h-28 flex items-center justify-center relative cursor-pointer group"
              title="Click to zoom image"
            >
              <img
                src={afterImage}
                alt="After Repair"
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <ZoomIn className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-emerald-950/90 text-emerald-400 rounded text-[9px] font-bold border border-emerald-500/30">
                Verified Patch
              </span>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleVerify} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Inspector / Engineer Name</label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Inspection Notes & Sign-off</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Signing Off...' : 'Complete Sign-off'}
            </button>
          </div>
        </form>

      </div>

      {/* High-Resolution Evidence Lightbox Modal */}
      <ImageModal
        imageUrl={inspectingImage}
        title="Repair Verification Evidence Inspection"
        onClose={() => setInspectingImage(null)}
      />
    </div>
  );
}
