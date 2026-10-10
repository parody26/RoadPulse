import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, ShieldCheck, MapPin, ExternalLink, CheckCircle } from 'lucide-react';

export default function IncidentMap({ incidents, selectedIncident, setSelectedIncident, onOpenVerification }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      // Default to MG Road Bengaluru coordinates
      const map = L.map(mapRef.current, {
        center: [12.978, 77.601],
        zoom: 14,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Dark theme OpenStreetMap tiles via CartoDB Dark Matter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

      leafletMapRef.current = map;
    }
  }, []);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    if (incidents.length === 0) return;

    const bounds = L.latLngBounds();

    incidents.forEach((inc) => {
      bounds.extend([inc.latitude, inc.longitude]);

      // Marker color selection based on risk and status
      let colorClass = 'bg-amber-500 border-amber-300 text-slate-950 shadow-amber-500/50';
      if (inc.status === 'verified') {
        colorClass = 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-emerald-500/50';
      } else if (inc.risk_score >= 75) {
        colorClass = 'bg-rose-600 border-rose-300 text-white shadow-rose-600/50 animate-pulse';
      } else if (inc.risk_score >= 55) {
        colorClass = 'bg-amber-500 border-amber-200 text-slate-950 shadow-amber-500/50';
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-xs shadow-lg transition-transform hover:scale-125 ${colorClass}">
            ${Math.round(inc.risk_score)}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon }).addTo(map);

      const evidenceUrl = inc.evidence && inc.evidence[0] ? inc.evidence[0].image_url : null;
      const imgHtml = evidenceUrl ? `
        <div class="rounded-lg overflow-hidden border border-slate-700 bg-slate-950 h-28 my-1.5">
          <img src="${evidenceUrl}" alt="Defect Evidence" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=300&auto=format&fit=crop&q=60'" />
        </div>
      ` : '';

      // Popup Content
      const popupHtml = `
        <div class="p-3 max-w-xs space-y-2 text-xs font-sans">
          <div class="flex items-center justify-between border-b border-slate-700 pb-2">
            <span class="font-bold text-sm text-cyan-400">${inc.damage_type}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
              inc.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }">
              ${inc.status.toUpperCase()}
            </span>
          </div>

          ${imgHtml}

          <p class="text-slate-300 font-medium">${inc.location_name}</p>

          <div class="grid grid-cols-2 gap-2 text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800">
            <div>Severity: <b class="text-slate-200">${Math.round(inc.severity * 100)}%</b></div>
            <div>Risk Score: <b class="text-amber-400">${inc.risk_score}</b></div>
            <div>Est. Cost: <b class="text-cyan-400">₹${Math.round(Number(inc.estimated_cost)).toLocaleString('en-IN')}</b></div>
            <div>Conf: <b class="text-slate-200">${Math.round(inc.confidence * 100)}%</b></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        setSelectedIncident(inc);
      });

      markersRef.current[inc.id] = marker;
    });

    if (incidents.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [incidents]);

  // Center map on selected incident
  useEffect(() => {
    if (selectedIncident && leafletMapRef.current) {
      leafletMapRef.current.panTo([selectedIncident.latitude, selectedIncident.longitude], { animate: true });
      const marker = markersRef.current[selectedIncident.id];
      if (marker) marker.openPopup();
    }
  }, [selectedIncident]);

  return (
    <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={mapRef} className="w-full h-full z-10" />

      {/* Empty State Overlay */}
      {incidents.length === 0 && (
        <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <MapPin className="w-10 h-10 text-cyan-400/80 mb-3 animate-bounce" />
          <h4 className="text-sm font-bold text-white">No Road Defects Reported Yet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            All mock example data has been removed. Once citizens or inspectors record and submit defects through the portal, real verified incidents will be mapped here with GPS coordinates.
          </p>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute top-4 right-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-800 px-3.5 py-2.5 rounded-xl shadow-lg text-xs space-y-2">
        <div className="font-semibold text-slate-300 border-b border-slate-800 pb-1 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Map Priority Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-600 border border-rose-300 animate-pulse"></span>
          <span className="text-slate-400">Critical Risk (Score &ge; 75)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-200"></span>
          <span className="text-slate-400">High Risk (Score 55–74)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-200"></span>
          <span className="text-slate-400">Verified & Repaired</span>
        </div>
      </div>
    </div>
  );
}
