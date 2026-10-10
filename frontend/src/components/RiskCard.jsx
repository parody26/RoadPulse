import React from 'react';
import { Activity, ShieldAlert, Cpu, Eye, DollarSign, CheckCircle2, Sliders } from 'lucide-react';

export default function RiskCard({ incident, onVerifyClick, onUpdateIncident }) {
  if (!incident) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-slate-500 text-sm flex flex-col items-center justify-center h-full min-h-[320px]">
        <Activity className="w-10 h-10 mb-3 text-slate-700 animate-pulse" />
        <p className="font-medium text-slate-400">No Incident Selected</p>
        <p className="text-xs text-slate-600 mt-1 max-w-xs">Click on any marker on the map or row in the table to inspect explainable risk scoring.</p>
      </div>
    );
  }

  // Calculate factor point breakdowns
  const sevPoints = (45.0 * incident.severity).toFixed(1);
  const impPoints = (25.0 * incident.road_importance).toFixed(1);
  const expPoints = (20.0 * incident.exposure_factor).toFixed(1);
  const confPoints = (10.0 * incident.confidence).toFixed(1);

  const isVerified = incident.status === 'verified';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
      {/* Card Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
              <h3 className="text-lg font-bold text-white">{incident.damage_type}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{incident.location_name}</p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black tracking-tight text-cyan-400">{incident.risk_score}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Explainable Risk Index</div>
          </div>
        </div>
      </div>

      {/* Visual Evidence Preview */}
      {incident.evidence && incident.evidence.length > 0 && (
        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-40">
          <img
            src={incident.evidence[0].image_url}
            alt="Defect Evidence"
            className="w-full h-36 object-cover object-center"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60';
            }}
          />
          <div className="absolute top-2 left-2 px-2 py-1 bg-slate-950/80 backdrop-blur rounded text-[10px] font-semibold text-slate-300 border border-slate-700">
            YOLO Evidence Frame ({incident.evidence[0].frame_timestamp}s)
          </div>
        </div>
      )}

      {/* Risk Formula Breakdown */}
      <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
        <div className="text-xs font-semibold text-slate-300 flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span>Explainable Formula Breakdown</span>
          <span className="font-mono text-[10px] text-cyan-400">Risk = 100(0.45S + 0.25R + 0.20E + 0.10C)</span>
        </div>

        {/* Severity */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Damage Severity (S - 45%)</span>
            <span className="font-semibold text-rose-400">{Math.round(incident.severity * 100)}% ({sevPoints} pts)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${incident.severity * 100}%` }}></div>
          </div>
        </div>

        {/* Road Importance */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Road Importance (R - 25%)</span>
            <span className="font-semibold text-amber-400">{Math.round(incident.road_importance * 100)}% ({impPoints} pts)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${incident.road_importance * 100}%` }}></div>
          </div>
        </div>

        {/* Exposure */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Traffic Exposure (E - 20%)</span>
            <span className="font-semibold text-cyan-400">{Math.round(incident.exposure_factor * 100)}% ({expPoints} pts)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${incident.exposure_factor * 100}%` }}></div>
          </div>
        </div>

        {/* Confidence */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>YOLO Confidence (C - 10%)</span>
            <span className="font-semibold text-emerald-400">{Math.round(incident.confidence * 100)}% ({confPoints} pts)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${incident.confidence * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div className="text-xs">
          <span className="text-slate-400">Est. Repair Cost:</span>{' '}
          <span className="font-bold text-white">${incident.estimated_cost.toLocaleString()}</span>
        </div>

        <button
          onClick={() => onVerifyClick(incident)}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg ${
            isVerified
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-cyan-500/20'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {isVerified ? 'Verified & Complete' : 'Verify Repair Completion'}
        </button>
      </div>
    </div>
  );
}
