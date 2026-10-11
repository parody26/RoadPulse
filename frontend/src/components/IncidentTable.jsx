import React, { useState } from 'react';
import { Filter, Search, ShieldAlert, CheckCircle2, ChevronRight, ZoomIn } from 'lucide-react';
import ImageModal from './ImageModal';

export default function IncidentTable({ incidents, selectedIncident, setSelectedIncident, onVerifyClick }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [inspectingImage, setInspectingImage] = useState(null);

  const filtered = incidents.filter(inc => {
    const matchesSearch = inc.location_name.toLowerCase().includes(search.toLowerCase()) ||
                          inc.damage_type.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || inc.damage_type === filterType;
    const matchesStatus = filterStatus === 'ALL' || inc.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" /> Mapped Incident Register
          </h3>
          <p className="text-xs text-slate-400">Consolidated road defect evidence from video inspection</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search location/type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Defect Types</option>
            <option value="Pothole">Pothole</option>
            <option value="Alligator Crack">Alligator Crack</option>
            <option value="Longitudinal Crack">Longitudinal Crack</option>
            <option value="Transverse Crack">Transverse Crack</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="reported">Reported</option>
            <option value="reviewed">Reviewed</option>
            <option value="in_progress">In Progress</option>
            <option value="verified">Verified</option>
          </select>
        </div>
      </div>

      {/* Incident Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-3 text-center">Visual Evidence</th>
              <th className="py-3 px-3">Defect Type</th>
              <th className="py-3 px-3">Location</th>
              <th className="py-3 px-3 text-center">Severity</th>
              <th className="py-3 px-3 text-center">Risk Score</th>
              <th className="py-3 px-3 text-right">Est. Cost (₹)</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ShieldAlert className="w-8 h-8 text-slate-700" />
                    <p className="text-slate-400 font-medium">No Incidents in Municipal Register</p>
                    <p className="text-slate-600 text-[11px] max-w-sm">
                      All mock example cases have been cleared. As citizens record and submit road defects through the portal, real verified incidents will appear here.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((inc) => {
                const isSelected = selectedIncident && selectedIncident.id === inc.id;
                const isVerified = inc.status === 'verified';
                const evidenceUrl = inc.evidence && inc.evidence[0] ? inc.evidence[0].image_url : null;

                return (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`cursor-pointer transition-colors hover:bg-slate-800/50 ${
                      isSelected ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      {evidenceUrl ? (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingImage(evidenceUrl);
                          }}
                          className="relative inline-block overflow-hidden rounded-lg border border-slate-800 cursor-pointer group"
                          title="Click to inspect evidence image"
                        >
                          <img
                            src={evidenceUrl}
                            alt="Evidence"
                            className="w-12 h-9 object-cover group-hover:scale-110 transition-transform"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=300&auto=format&fit=crop&q=60';
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px]">No image</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-semibold text-white">
                      {inc.damage_type}
                    </td>

                    <td className="py-3 px-3 text-slate-300 max-w-[220px]">
                      <div className="font-medium text-white truncate">{inc.location_name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="text-cyan-400 font-medium">👤 {inc.reporter_name || 'Citizen Reporter'}</span>
                        {inc.points_awarded ? (
                          <span className="text-amber-300 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30 font-semibold font-mono text-[9px]">
                            +{inc.points_awarded} pts
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-rose-400">
                      {Math.round(inc.severity * 100)}%
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        inc.risk_score >= 75 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                        inc.risk_score >= 55 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                        'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      }`}>
                        {inc.risk_score}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-cyan-400 font-bold">
                      ₹{Math.round(Number(inc.estimated_cost)).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isVerified
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {inc.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVerifyClick(inc);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                      >
                        {isVerified ? 'View Sign-off' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* High-Resolution Evidence Lightbox Modal */}
      <ImageModal
        imageUrl={inspectingImage}
        title="Mapped Road Defect Visual Evidence"
        onClose={() => setInspectingImage(null)}
      />
    </div>
  );
}
