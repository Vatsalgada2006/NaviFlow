/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RouteCandidate, Coordinates, StopAmenity, WeatherPoint, SafetyFacility } from '../types';
import { CloudRain, Shield, AlertTriangle, Layers, Eye, EyeOff } from 'lucide-react';

interface Props {
  origin: Coordinates;
  destination: Coordinates;
  candidates: RouteCandidate[];
  selectedCandidateId: string;
  onSelectCandidate?: (id: string) => void;
  isDashboardMode?: boolean;
}

export const LeafletMap: React.FC<Props> = ({
  origin,
  destination,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  isDashboardMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  // Overlay layer visibility toggles
  const [showWeatherLayer, setShowWeatherLayer] = useState(true);
  const [showSafetyLayer, setShowSafetyLayer] = useState(true);
  const [showStopsLayer, setShowStopsLayer] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [origin?.lat || 20.5937, origin?.lon || 78.9629],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    // TomTom Map Display API raster tiles via server-side secure proxy with automatic OSM/Carto fallback
    const tileStyle = isDashboardMode ? 'main' : 'night';
    L.tileLayer(`/api/map-tiles/${tileStyle}/{z}/{x}/{y}.png`, {
      attribution:
        '&copy; <a href="https://www.tomtom.com" target="_blank" rel="noreferrer">TomTom</a>, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>, <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>',
      maxZoom: 19,
      className: isDashboardMode ? 'high-contrast-tiles' : '',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isDashboardMode]);

  // Update Routes, Pins, Stops, Weather, and Safety
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Add Origin Marker
    if (origin && origin.lat && origin.lon) {
      const originIcon = L.divIcon({
        className: 'custom-pin-origin',
        html: `
          <div style="background-color: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            A
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const m = L.marker([origin.lat, origin.lon], { icon: originIcon }).addTo(layers);
      m.bindPopup(`<div style="color: #0f172a; font-size: 12px; font-weight: 700; font-family: sans-serif;">Origin: ${origin.name}</div>`);
      bounds.extend([origin.lat, origin.lon]);
    }

    // 2. Add Destination Marker
    if (destination && destination.lat && destination.lon) {
      const destIcon = L.divIcon({
        className: 'custom-pin-dest',
        html: `
          <div style="background-color: #ef4444; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            B
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const m = L.marker([destination.lat, destination.lon], { icon: destIcon }).addTo(layers);
      m.bindPopup(`<div style="color: #0f172a; font-size: 12px; font-weight: 700; font-family: sans-serif;">Destination: ${destination.name}</div>`);
      bounds.extend([destination.lat, destination.lon]);
    }

    // 3. Render Route Polylines
    candidates.forEach((cand) => {
      if (!cand.geometry || cand.geometry.length === 0) return;

      const isSelected = cand.id === selectedCandidateId;
      const latlngs = cand.geometry.map(([lat, lon]) => [lat, lon] as [number, number]);

      if (isSelected) {
        // Glowing halo polyline underneath
        L.polyline(latlngs, {
          color: '#0891b2',
          weight: 10,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layers);

        // Active Polyline (Deep highway blue / cyan)
        const line = L.polyline(latlngs, {
          color: '#06b6d4',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layers);

        latlngs.forEach((pt) => bounds.extend(pt));

        line.bindPopup(
          `<div style="color:#0f172a; font-size:12px; font-family:sans-serif; line-height: 1.4;">
            <strong style="color:#0891b2; font-size: 13px;">${cand.name} (Active Route)</strong><br/>
            ${cand.distanceKm} km · ${Math.floor(cand.totalDurationMinutes / 60)}h ${cand.totalDurationMinutes % 60}m · ₹${cand.totalCostInr}<br/>
            <span style="color:#64748b; font-size:11px;">Traffic: ${cand.trafficSource}</span>
          </div>`
        );
      } else {
        // Alternate route: dashed slate
        const altLine = L.polyline(latlngs, {
          color: '#64748b',
          weight: 3.5,
          opacity: 0.65,
          dashArray: '6, 8',
          lineCap: 'round',
        }).addTo(layers);

        altLine.on('click', () => {
          if (onSelectCandidate) onSelectCandidate(cand.id);
        });

        altLine.bindPopup(
          `<div style="color:#0f172a; font-size:12px; font-family:sans-serif; line-height: 1.4;">
            <strong>${cand.name} (Alternate)</strong><br/>
            ${cand.distanceKm} km · ${Math.floor(cand.totalDurationMinutes / 60)}h ${cand.totalDurationMinutes % 60}m · ₹${cand.totalCostInr}<br/>
            <button style="margin-top:6px; padding:3px 8px; background:#0284c7; color:white; border:none; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;" onclick="window.selectNaviFlowRoute && window.selectNaviFlowRoute('${cand.id}')">Select this route</button>
          </div>`
        );
      }
    });

    const activeRoute = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

    // 4. Render Stop Markers for active route
    if (showStopsLayer && activeRoute && activeRoute.allStops) {
      activeRoute.allStops.slice(0, 30).forEach((stop: StopAmenity) => {
        if (!stop.lat || !stop.lon) return;

        let bgColor = '#f59e0b'; // amber fuel
        let symbol = '⛽';
        let typeLabel = 'Fuel Station';

        if (stop.type === 'ev_charger') {
          bgColor = '#06b6d4';
          symbol = '⚡';
          typeLabel = `EV Fast Charger (${stop.chargerPowerKw || 50} kW)`;
        } else if (stop.type === 'cng') {
          bgColor = '#10b981';
          symbol = 'CNG';
          typeLabel = 'CNG Station';
        } else if (stop.type === 'toll') {
          bgColor = '#eab308';
          symbol = '₹';
          typeLabel = stop.name.includes('Toll') ? stop.name : `FASTag Plaza (~₹${stop.tollFeeEstimatedInr || 120})`;
        } else if (stop.type === 'food') {
          bgColor = '#6366f1';
          symbol = '🍽';
          typeLabel = 'Food & Rest Plaza';
        }

        const stopIcon = L.divIcon({
          className: 'stop-custom-icon',
          html: `
            <div style="background-color: ${bgColor}; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 1.5px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">
              ${symbol}
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon }).addTo(layers);
        marker.bindPopup(`
          <div style="color: #0f172a; font-size: 12px; font-family: sans-serif; max-width: 220px; line-height: 1.4;">
            <div style="font-weight: 700; color: ${bgColor}">${typeLabel}</div>
            <div style="font-weight: 600; margin-top: 2px;">${stop.name}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 3px;">
              ${stop.brand ? `Brand: <strong>${stop.brand}</strong><br/>` : ''}
              ${stop.distanceFromOriginKm ? `~${stop.distanceFromOriginKm} km from departure<br/>` : ''}
              ${stop.hasToilets ? '✓ Clean Washrooms ' : ''}
              ${stop.isOpen24x7 ? '✓ 24/7 Service' : ''}
            </div>
          </div>
        `);
      });
    }

    // 5. Render Along-Route Weather Layer (Open-Meteo)
    if (showWeatherLayer && activeRoute && activeRoute.weather && activeRoute.weather.length > 0) {
      activeRoute.weather.forEach((w: WeatherPoint) => {
        if (!w.lat || !w.lon) return;

        const isRain = w.isRainWarning;
        const isHeat = w.isHeatWarning;
        const badgeColor = isRain ? '#3b82f6' : isHeat ? '#ef4444' : '#0284c7';

        const weatherIcon = L.divIcon({
          className: 'weather-pin-icon',
          html: `
            <div style="background-color: ${badgeColor}; color: white; padding: 2px 6px; border-radius: 12px; font-size: 10px; font-weight: 700; border: 1.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 3px; white-space: nowrap;">
              <span>${isRain ? '🌧' : isHeat ? '🔥' : '☀️'}</span>
              <span>${w.tempC}°C</span>
            </div>
          `,
          iconSize: [48, 20],
          iconAnchor: [24, 10],
        });

        const m = L.marker([w.lat, w.lon], { icon: weatherIcon }).addTo(layers);
        m.bindPopup(`
          <div style="color:#0f172a; font-size:12px; font-family:sans-serif; line-height:1.4;">
            <div style="font-weight:700; color:${badgeColor}; font-size:12px;">Open-Meteo Live Forecast</div>
            <div style="font-weight:600; margin-top:2px;">${w.locationName}: ${w.tempC}°C</div>
            <div style="color:#475569; font-size:11px;">Condition: ${w.conditionText}</div>
            ${isRain ? '<div style="color:#dc2626; font-weight:700; font-size:11px; margin-top:2px;">⚠️ Wet road & rain warning</div>' : ''}
            ${isHeat ? '<div style="color:#ea580c; font-weight:700; font-size:11px; margin-top:2px;">⚠️ Extreme ambient heat warning</div>' : ''}
          </div>
        `);
      });
    }

    // 6. Render Along-Route Safety Layer (Hospitals, Police, 24/7 Tyre repair)
    if (showSafetyLayer && activeRoute && activeRoute.safetyFacilities && activeRoute.safetyFacilities.length > 0) {
      activeRoute.safetyFacilities.forEach((s: SafetyFacility) => {
        if (!s.lat || !s.lon) return;

        let iconSym = '🏥';
        let sColor = '#ef4444';
        if (s.type === 'police') {
          iconSym = '🚓';
          sColor = '#3b82f6';
        } else if (s.type === 'repair' || s.type === 'tyres') {
          iconSym = '🔧';
          sColor = '#10b981';
        }

        const safetyIcon = L.divIcon({
          className: 'safety-pin-icon',
          html: `
            <div style="background-color: ${sColor}; color: white; width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
              ${iconSym}
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const sm = L.marker([s.lat, s.lon], { icon: safetyIcon }).addTo(layers);
        sm.bindPopup(`
          <div style="color:#0f172a; font-size:12px; font-family:sans-serif; max-width:200px;">
            <div style="font-weight:700; color:${sColor}; text-transform:capitalize;">${s.type} Emergency Facility</div>
            <div style="font-weight:600; margin-top:2px;">${s.name}</div>
            ${s.phone ? `<div style="color:#0284c7; font-weight:600; font-size:11px; margin-top:2px;">Emergency Dial: ${s.phone}</div>` : ''}
            <div style="color:#64748b; font-size:11px;">Corridor distance: ~${s.distanceFromOriginKm} km</div>
          </div>
        `);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [
    origin,
    destination,
    candidates,
    selectedCandidateId,
    onSelectCandidate,
    showWeatherLayer,
    showSafetyLayer,
    showStopsLayer,
  ]);

  // Expose global route selector for Leaflet popup HTML
  useEffect(() => {
    (window as any).selectNaviFlowRoute = (id: string) => {
      if (onSelectCandidate) onSelectCandidate(id);
    };
    return () => {
      delete (window as any).selectNaviFlowRoute;
    };
  }, [onSelectCandidate]);

  return (
    <div className="relative w-full h-full min-h-[420px] overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />

      {/* Floating Layer Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-xl text-xs">
        <button
          type="button"
          onClick={() => setShowWeatherLayer(!showWeatherLayer)}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
            showWeatherLayer ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="Toggle Open-Meteo corridor weather & warnings"
        >
          <CloudRain className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Weather</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSafetyLayer(!showSafetyLayer)}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
            showSafetyLayer ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="Toggle safety layer (hospitals, police, 24/7 repair)"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Safety</span>
        </button>

        <button
          type="button"
          onClick={() => setShowStopsLayer(!showStopsLayer)}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
            showStopsLayer ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="Toggle fuel, EV charger, toll, and rest stops"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Stops</span>
        </button>
      </div>

      {/* Floating Map Legend & Attribution */}
      <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 shadow-md flex items-center gap-2 pointer-events-auto">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
          <span className="hidden sm:inline">Active</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
          <span className="hidden sm:inline">Alt</span>
        </span>
        <span className="text-slate-500">&middot;</span>
        <span className="text-slate-400 text-[10px]">TomTom / OSRM &middot; Open-Meteo &middot; OSM</span>
      </div>
    </div>
  );
};
