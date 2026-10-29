/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, Database, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSourcesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealthData(data))
      .catch((err) => console.error('Failed to load health:', err))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-400" />
            <h3 className="text-lg font-bold text-white">Live Data Providers & Attribution</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          NaviFlow utilizes TomTom as its primary routing and map display engine, backed by an automatic OSRM fallback, Overpass corridor amenity filters, and Open Charge Map for EV points.
        </p>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
            <span>Probing live provider endpoints...</span>
          </div>
        ) : healthData ? (
          <div className="space-y-4">
            {/* Cache Stats */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">In-Memory LRU Cache:</span>
              <span className="text-teal-400">
                Routes: {healthData.cache?.routes} | Geocodes: {healthData.cache?.geocodes} | Stops: {healthData.cache?.stops} | Fuel: {healthData.cache?.fuel}
              </span>
            </div>

            {/* Providers List */}
            <div className="divide-y divide-slate-800/80 text-xs">
              {/* TomTom Routing & Map Display */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-200">TomTom Routing &amp; Map Display API (Primary)</div>
                  <p className="text-slate-400">
                    Live traffic-aware ETA (traffic=true), multiple route corridors, avoid=tollRoads no-toll variant, and Map Display raster tiles.
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded shrink-0 ${
                    healthData.providers?.tomtom?.status === 'active'
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-amber-950 text-amber-300'
                  }`}
                >
                  {healthData.providers?.tomtom?.status === 'active' ? 'Active (Primary)' : 'OSRM Fallback Active'}
                </span>
              </div>

              {/* OSRM Fallback */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-200">Project OSRM Routing Engine (Automatic Fallback)</div>
                  <p className="text-slate-400">
                    Engaged automatically when TomTom daily limit (429) is reached, key is missing, or server errors occur. Labeled &quot;No live traffic&quot;.
                  </p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 shrink-0">
                  Fallback Standby
                </span>
              </div>

              {/* Photon */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-200">Photon (Komoot)</div>
                  <p className="text-slate-400">Typeahead Autocomplete biased to India bbox (68°–98°E, 6°–36°N).</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-300 shrink-0">
                  Active (Free)
                </span>
              </div>

              {/* Nominatim */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-200">Nominatim (OpenStreetMap)</div>
                  <p className="text-slate-400">Final Geocoding &amp; Reverse Geocoding. 1 req/sec enqueued strictly.</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-300 shrink-0">
                  Rate-Queued
                </span>
              </div>

              {/* Overpass */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-200">Overpass API (3 Resilient Mirrors)</div>
                  <p className="text-slate-400">Corridor query for fuel, CNG, EV chargers, tolls, washrooms, and food.</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-300 shrink-0">
                  3 Mirrors
                </span>
              </div>

              {/* Gemini Search Grounding */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-200">Gemini 3.8 Flash + Google Search Grounding</div>
                  <p className="text-slate-400">
                    Live today retail fuel rate lookup (Petrol, Diesel, CNG) + state reference table fallback.
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded shrink-0 ${
                    healthData.providers?.gemini?.status === 'active'
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-amber-950 text-amber-300'
                  }`}
                >
                  {healthData.providers?.gemini?.status === 'active' ? 'Active (Search)' : 'State Matrix Fallback'}
                </span>
              </div>

              {/* Open Charge Map */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-200">Open Charge Map (OCM)</div>
                  <p className="text-slate-400">India EV fast charging connector power and live operational status.</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 shrink-0">
                  {healthData.providers?.openChargeMap?.note}
                </span>
              </div>
            </div>

            {/* Mandatory Open Source Attributions */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Open Data Attribution Notice</span>
              </div>
              <p>
                Routing &amp; Map Tiles powered by <a href="https://www.tomtom.com" target="_blank" rel="noreferrer" className="text-teal-400 underline">TomTom</a> (with OSRM fallback).
                Map data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-teal-400 underline">OpenStreetMap</a> contributors under ODbL.
                Geocoding by <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer" className="text-teal-400 underline">Photon</a> / Nominatim.
                EV charging POIs via Overpass &amp; Open Charge Map.
              </p>
            </div>
          </div>
        ) : null}

        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
