import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, ShieldCheck, MapPin, ExternalLink, CheckCircle, Layers, Key, Check, X } from 'lucide-react';

const TILE_PROVIDERS = {
  cartoDark: {
    name: 'Carto Dark',
    icon: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    requiresCartoKey: true,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19
  },
  cartoVoyager: {
    name: 'Carto Voyager',
    icon: '🏙️',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    requiresCartoKey: true,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19
  },
  cartoLight: {
    name: 'Carto Light',
    icon: '☀️',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    requiresCartoKey: true,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19
  },
  googleRoadmap: {
    name: 'Google Roadmap',
    icon: '🗺️',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20
  },
  googleSatellite: {
    name: 'Google Satellite',
    icon: '🛰️',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
    maxZoom: 20
  },
  openStreetMap: {
    name: 'OpenStreetMap',
    icon: '🌐',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }
};

export default function IncidentMap({ incidents, selectedIncident, setSelectedIncident, onOpenVerification }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});

  const [activeProvider, setActiveProvider] = useState('cartoDark');

  // CARTO & Google API Keys
  const [cartoApiKey, setCartoApiKey] = useState(() => {
    try {
      return localStorage.getItem('roadpulse_carto_api_key') || import.meta.env.VITE_CARTO_API_KEY || '';
    } catch {
      return '';
    }
  });

  const [googleApiKey, setGoogleApiKey] = useState(() => {
    try {
      return localStorage.getItem('roadpulse_google_maps_api_key') || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    } catch {
      return '';
    }
  });

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempCartoKey, setTempCartoKey] = useState('');
  const [tempGoogleKey, setTempGoogleKey] = useState('');

  // Get tile URL with authenticated API key appended
  const getAuthenticatedTileUrl = (providerKey, cKey = cartoApiKey) => {
    const provider = TILE_PROVIDERS[providerKey] || TILE_PROVIDERS.cartoDark;
    let url = provider.url;

    if (provider.requiresCartoKey && cKey) {
      url += `?api_key=${encodeURIComponent(cKey)}`;
    }
    return url;
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, {
        center: [12.978, 77.601],
        zoom: 14,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const provider = TILE_PROVIDERS[activeProvider];
      const tileUrl = getAuthenticatedTileUrl(activeProvider, cartoApiKey);

      const tileLayer = L.tileLayer(tileUrl, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      leafletMapRef.current = map;
    }
  }, []);

  // Switch Tile Provider
  const switchProvider = (key) => {
    setActiveProvider(key);
    const map = leafletMapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const provider = TILE_PROVIDERS[key];
    const tileUrl = getAuthenticatedTileUrl(key, cartoApiKey);

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom
    }).addTo(map);
  };

  // Save API Keys
  const handleSaveApiKeys = () => {
    const trimmedCarto = tempCartoKey.trim();
    const trimmedGoogle = tempGoogleKey.trim();

    setCartoApiKey(trimmedCarto);
    setGoogleApiKey(trimmedGoogle);

    try {
      localStorage.setItem('roadpulse_carto_api_key', trimmedCarto);
      localStorage.setItem('roadpulse_google_maps_api_key', trimmedGoogle);
    } catch (e) {
      console.warn(e);
    }

    // Refresh active tile layer with new key
    switchProvider(activeProvider);
    setShowKeyModal(false);
  };

  // Render Markers
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
      {/* Map Element */}
      <div ref={mapRef} className="w-full h-full z-10" />

      {/* Top Left: Map Layer Provider Switcher */}
      <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-xl shadow-xl flex flex-wrap items-center gap-1 text-xs">
        {Object.entries(TILE_PROVIDERS).map(([key, prov]) => (
          <button
            key={key}
            onClick={() => switchProvider(key)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeProvider === key
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{prov.icon}</span>
            <span className="hidden sm:inline">{prov.name}</span>
          </button>
        ))}

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

        {/* CARTO / Google API Key Config Button */}
        <button
          onClick={() => {
            setTempCartoKey(cartoApiKey);
            setTempGoogleKey(googleApiKey);
            setShowKeyModal(true);
          }}
          className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
            cartoApiKey || googleApiKey
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
          }`}
          title={cartoApiKey ? "CARTO Key active" : "Click to configure CARTO API Key"}
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden md:inline">
            {cartoApiKey ? 'CARTO Key Active' : googleApiKey ? 'Google Key Active' : 'Set CARTO Key'}
          </span>
        </button>
      </div>

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

      {/* CARTO & Google API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Map Provider API Key Configuration</span>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Paste your <b>CARTO API Key</b> below to authenticate Carto Dark, Voyager, and Light map tiles and remove tile watermarks.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">CARTO API Key</label>
                <input
                  type="password"
                  placeholder="Paste your CARTO API Key..."
                  value={tempCartoKey}
                  onChange={(e) => setTempCartoKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Optional Google Maps API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={tempGoogleKey}
                  onChange={(e) => setTempGoogleKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKeys}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Save Keys & Reload Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
