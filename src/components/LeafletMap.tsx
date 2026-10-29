/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RouteCandidate, Coordinates, StopAmenity, WeatherPoint, SafetyFacility } from '../types';
import { CloudRain, Shield, Layers, Maximize2, RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';

interface Props {
  origin?: Coordinates | null;
  destination?: Coordinates | null;
  candidates?: RouteCandidate[];
  selectedCandidateId?: string;
  onSelectCandidate?: (id: string) => void;
  isDashboardMode?: boolean;
  isDarkMode?: boolean;
  onOpenFullMap?: () => void;
  isFullScreen?: boolean;
  onCloseFullScreen?: () => void;
}

// 100% free OpenStreetMap tile endpoints with zero required API keys and zero watermarks
const TILE_SOURCES = {
  light: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  dark: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  fallback: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
};

export const LeafletMap: React.FC<Props> = ({
  origin,
  destination,
  candidates = [],
  selectedCandidateId,
  onSelectCandidate,
  isDashboardMode = false,
  isDarkMode = false,
  onOpenFullMap,
  isFullScreen = false,
  onCloseFullScreen,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Overlay layer visibility toggles
  const [showWeatherLayer, setShowWeatherLayer] = useState(true);
  const [showSafetyLayer, setShowSafetyLayer] = useState(true);
  const [showStopsLayer, setShowStopsLayer] = useState(true);

  // Tile loading & error states
  const [isMapReady, setIsMapReady] = useState(false);
  const [tilesSlowWarning, setTilesSlowWarning] = useState(false);
  const [isUsingFallbackTiles, setIsUsingFallbackTiles] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center of India as natural default
    const defaultCenter: [number, number] = [21.7679, 78.8718];
    const initialCenter: [number, number] =
      origin && origin.lat && origin.lon
        ? [origin.lat, origin.lon]
        : defaultCenter;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: candidates && candidates.length > 0 ? 7 : 5,
      zoomControl: true,
      attributionControl: false,
    });

    const isNight = isDarkMode || isDashboardMode;
    const tileUrl = isUsingFallbackTiles
      ? TILE_SOURCES.fallback
      : isNight
      ? TILE_SOURCES.dark
      : TILE_SOURCES.light;

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
      className: isNight ? 'dark-map-tiles' : 'calm-map-tiles',
    });

    let tileErrorTimeout: NodeJS.Timeout;

    tileLayer.on('loading', () => {
      tileErrorTimeout = setTimeout(() => {
        setTilesSlowWarning(true);
      }, 5000);
    });

    tileLayer.on('load', () => {
      clearTimeout(tileErrorTimeout);
      setTilesSlowWarning(false);
      setIsMapReady(true);
    });

    tileLayer.on('tileerror', () => {
      clearTimeout(tileErrorTimeout);
      setTilesSlowWarning(true);
      if (!isUsingFallbackTiles) {
        // Automatically switch to standard OSM fallback
        setIsUsingFallbackTiles(true);
      }
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    const layerGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Explicit invalidateSize calls after layout settles
    const timer1 = setTimeout(() => map.invalidateSize(), 60);
    const timer2 = setTimeout(() => map.invalidateSize(), 300);
    const timer3 = setTimeout(() => map.invalidateSize(), 800);

    // Watch resize of the container element with ResizeObserver
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(tileErrorTimeout);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isDashboardMode, isDarkMode, isUsingFallbackTiles]);

  // Handle tile retry
  const handleRetryTiles = () => {
    setTilesSlowWarning(false);
    if (mapInstanceRef.current && tileLayerRef.current) {
      tileLayerRef.current.redraw();
      mapInstanceRef.current.invalidateSize();
    }
  };

  // Invalidate size on candidate changes, screen mode changes, or window resize
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [candidates, selectedCandidateId, isFullScreen]);

  // Update Routes, Pins, Stops, Weather, and Safety
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    const bounds = L.latLngBounds([]);

    // 1. Add Origin Marker (A)
    if (origin && origin.lat && origin.lon) {
      const originIcon = L.divIcon({
        className: 'custom-pin-origin',
        html: `
          <div style="background-color: #0B6B3A; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
            A
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const m = L.marker([origin.lat, origin.lon], { icon: originIcon }).addTo(layers);
      m.bindPopup(`<div style="color: #1C1B1A; font-size: 14px; font-weight: 700; font-family: sans-serif;">Start: ${origin.name}</div>`);
      bounds.extend([origin.lat, origin.lon]);
    }

    // 2. Add Destination Marker (B)
    if (destination && destination.lat && destination.lon) {
      const destIcon = L.divIcon({
        className: 'custom-pin-dest',
        html: `
          <div style="background-color: #DC2626; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
            B
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const m = L.marker([destination.lat, destination.lon], { icon: destIcon }).addTo(layers);
      m.bindPopup(`<div style="color: #1C1B1A; font-size: 14px; font-weight: 700; font-family: sans-serif;">Destination: ${destination.name}</div>`);
      bounds.extend([destination.lat, destination.lon]);
    }

    // 3. Render Route Polylines
    // Primary green for winning/selected, Calm Grey for alternates
    candidates.forEach((cand) => {
      if (!cand.geometry || cand.geometry.length === 0) return;

      const isSelected = cand.id === selectedCandidateId || (!selectedCandidateId && cand.isBestOverall);
      const latlngs = cand.geometry.map(([lat, lon]) => [lat, lon] as [number, number]);

      if (isSelected) {
        // Road outline shadow for readability
        L.polyline(latlngs, {
          color: '#08522C',
          weight: 9,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layers);

        // Active Polyline (Highway Green #0B6B3A)
        const line = L.polyline(latlngs, {
          color: '#0B6B3A',
          weight: 5.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layers);

        latlngs.forEach((pt) => bounds.extend(pt));

        line.bindPopup(`
          <div style="font-family: sans-serif; font-size: 14px; color: #1C1B1A; padding: 2px;">
            <div style="font-weight: 700; color: #0B6B3A; font-size: 15px;">${cand.name}</div>
            <div style="color: #5C5A57; margin-top: 4px;">
              ${cand.distanceKm.toFixed(0)} km · ${Math.floor(cand.totalDurationMinutes / 60)} h ${cand.totalDurationMinutes % 60} min · ~₹${cand.totalCostInr}
            </div>
          </div>
        `);
      } else {
        // Alternate route (Calm grey #6B7280)
        const altLine = L.polyline(latlngs, {
          color: '#6B7280',
          weight: 4,
          opacity: 0.75,
          dashArray: '6, 6',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layers);

        latlngs.forEach((pt) => bounds.extend(pt));

        altLine.on('click', () => {
          if (onSelectCandidate) onSelectCandidate(cand.id);
        });

        altLine.bindPopup(`
          <div style="font-family: sans-serif; font-size: 14px; color: #1C1B1A;">
            <div style="font-weight: 700; color: #4B5563;">${cand.name} (Alternate)</div>
            <div style="margin-top: 3px;">${cand.distanceKm.toFixed(0)} km · ${Math.floor(cand.totalDurationMinutes / 60)} h ${cand.totalDurationMinutes % 60} min</div>
            <button onclick="window.selectNaviFlowRoute('${cand.id}')" style="margin-top: 6px; padding: 6px 12px; background-color: #0B6B3A; color: white; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; min-height: 44px;">
              Select Route
            </button>
          </div>
        `);
      }
    });

    const activeRoute = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

    // 4. Render Corridor Stops
    if (showStopsLayer && activeRoute && activeRoute.allStops) {
      activeRoute.allStops.forEach((stop: StopAmenity) => {
        if (!stop.lat || !stop.lon) return;

        let symbol = '⛽';
        let bgColor = '#0B6B3A';
        let typeLabel = 'Fuel Station';

        if (stop.type === 'ev_charger') {
          symbol = '⚡';
          bgColor = '#16A34A';
          typeLabel = 'EV Fast Charger';
        } else if (stop.type === 'toll') {
          symbol = '₹';
          bgColor = '#F5A524';
          typeLabel = 'Toll Plaza';
        } else if (stop.type === 'food' || stop.type === 'rest_area') {
          symbol = '🍽';
          bgColor = '#D97706';
          typeLabel = 'Rest Area & Food';
        }

        const stopIcon = L.divIcon({
          className: 'stop-custom-icon',
          html: `
            <div style="background-color: ${bgColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
              ${symbol}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon }).addTo(layers);
        marker.bindPopup(`
          <div style="color: #1C1B1A; font-size: 14px; font-family: sans-serif; max-width: 260px; line-height: 1.4;">
            <div style="font-weight: 700; color: ${bgColor}">${typeLabel}</div>
            <div style="font-weight: 600; margin-top: 2px;">${stop.name}</div>
            <div style="color: #5C5A57; font-size: 14px; margin-top: 4px;">
              ${stop.brand ? `Brand: <strong>${stop.brand}</strong><br/>` : ''}
              ${stop.distanceFromOriginKm ? `~${stop.distanceFromOriginKm} km from start<br/>` : ''}
              ${stop.hasToilets ? '✓ Clean Washrooms ' : ''}
              ${stop.isOpen24x7 ? '✓ 24/7 Service' : ''}
            </div>
          </div>
        `);
      });
    }

    // 5. Render Along-Route Weather Layer
    if (showWeatherLayer && activeRoute && activeRoute.weather && activeRoute.weather.length > 0) {
      activeRoute.weather.forEach((w: WeatherPoint) => {
        if (!w.lat || !w.lon) return;

        const isRain = w.isRainWarning;
        const isHeat = w.isHeatWarning;
        const badgeColor = isRain ? '#DC2626' : isHeat ? '#EA580C' : '#0B6B3A';

        const weatherIcon = L.divIcon({
          className: 'weather-pin-icon',
          html: `
            <div style="background-color: ${badgeColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 14px; font-weight: 700; border: 1.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
              <span>${isRain ? '🌧' : isHeat ? '🔥' : '☀️'}</span>
              <span>${w.tempC}°C</span>
            </div>
          `,
          iconSize: [64, 28],
          iconAnchor: [32, 14],
        });

        const m = L.marker([w.lat, w.lon], { icon: weatherIcon }).addTo(layers);
        m.bindPopup(`
          <div style="color: #1C1B1A; font-size: 14px; font-family: sans-serif; line-height: 1.4;">
            <div style="font-weight: 700; color: ${badgeColor};">Live Weather Radar</div>
            <div style="font-weight: 600; margin-top: 2px;">${w.locationName}: ${w.tempC}°C</div>
            <div style="color: #5C5A57; font-size: 14px;">Condition: ${w.conditionText}</div>
            ${isRain ? '<div style="color: #DC2626; font-weight: 700; margin-top: 3px;">⚠️ Wet highway surface caution</div>' : ''}
            ${isHeat ? '<div style="color: #EA580C; font-weight: 700; margin-top: 3px;">⚠️ High ambient heat warning</div>' : ''}
          </div>
        `);
      });
    }

    // 6. Render Along-Route Safety Layer
    if (showSafetyLayer && activeRoute && activeRoute.safetyFacilities && activeRoute.safetyFacilities.length > 0) {
      activeRoute.safetyFacilities.forEach((s: SafetyFacility) => {
        if (!s.lat || !s.lon) return;

        let iconSym = '🏥';
        let sColor = '#DC2626';
        if (s.type === 'police') {
          iconSym = '🚓';
          sColor = '#374151';
        } else if (s.type === 'repair' || s.type === 'tyres') {
          iconSym = '🔧';
          sColor = '#0B6B3A';
        }

        const safetyIcon = L.divIcon({
          className: 'safety-pin-icon',
          html: `
            <div style="background-color: ${sColor}; color: white; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
              ${iconSym}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const sm = L.marker([s.lat, s.lon], { icon: safetyIcon }).addTo(layers);
        sm.bindPopup(`
          <div style="color: #1C1B1A; font-size: 14px; font-family: sans-serif; max-width: 240px;">
            <div style="font-weight: 700; color: ${sColor}; text-transform: capitalize;">${s.type} Emergency Facility</div>
            <div style="font-weight: 600; margin-top: 2px;">${s.name}</div>
            ${s.phone ? `<div style="color: #0B6B3A; font-weight: 600; margin-top: 3px;">Emergency Call: ${s.phone}</div>` : ''}
            <div style="color: #5C5A57; font-size: 14px;">Corridor distance: ~${s.distanceFromOriginKm} km</div>
          </div>
        `);
      });
    }

    // Fit bounds with generous padding so the route is not obscured
    if (bounds.isValid() && candidates.length > 0) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    } else if (!candidates || candidates.length === 0) {
      // Clean India overview for fresh visits
      map.setView([21.7679, 78.8718], 5);
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
    <div
      className={`relative w-full h-full min-h-[300px] overflow-hidden ${
        isFullScreen ? 'fixed inset-0 z-50 bg-[#FAF8F5] dark:bg-[#121311]' : ''
      }`}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Loading Skeleton */}
      {!isMapReady && (
        <div className="absolute inset-0 z-[300] bg-stone-100 dark:bg-stone-900 flex flex-col items-center justify-center p-4">
          <RefreshCw className="w-6 h-6 text-[#0B6B3A] dark:text-[#22C55E] animate-spin mb-2" />
          <span className="text-sm font-semibold text-[#5C5A57] dark:text-[#A8A29E]">
            Loading national highway map...
          </span>
        </div>
      )}

      {/* The actual Leaflet map element */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      />

      {/* Tile Slow Warning & Fallback Banner */}
      {tilesSlowWarning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[450] bg-white dark:bg-[#1B1D1A] border border-amber-300 dark:border-amber-700 rounded-xl px-4 py-2 shadow-lg flex items-center gap-3 text-sm text-[#1C1B1A] dark:text-[#F5F4F0] animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Map tiles are slow to load, retrying</span>
          <button
            type="button"
            onClick={handleRetryTiles}
            className="min-h-[36px] px-3 py-1 bg-[#0B6B3A] hover:bg-[#08522C] text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Full Map Controls (Top Left) */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-2">
        {isFullScreen ? (
          <button
            type="button"
            onClick={onCloseFullScreen}
            className="min-h-[44px] px-4 py-2 bg-white dark:bg-[#1B1D1A] hover:bg-stone-100 dark:hover:bg-stone-800 text-[#1C1B1A] dark:text-[#F5F4F0] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl shadow-lg font-bold text-sm flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Back to plan</span>
          </button>
        ) : onOpenFullMap ? (
          <button
            type="button"
            onClick={onOpenFullMap}
            className="min-h-[44px] px-3.5 py-2 bg-white/95 dark:bg-[#1B1D1A]/95 hover:bg-white dark:hover:bg-[#1B1D1A] text-[#1C1B1A] dark:text-[#F5F4F0] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl shadow-md font-semibold text-sm flex items-center gap-2 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Full Map</span>
          </button>
        ) : null}
      </div>

      {/* Floating Layer Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-1.5 bg-white/95 dark:bg-[#1B1D1A]/95 backdrop-blur-md border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl p-1.5 shadow-lg text-sm">
        <button
          type="button"
          onClick={() => setShowWeatherLayer(!showWeatherLayer)}
          className={`min-h-[40px] px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
            showWeatherLayer
              ? 'bg-[#0B6B3A]/15 text-[#0B6B3A] dark:text-[#22C55E] border border-[#0B6B3A]/30'
              : 'text-[#5C5A57] dark:text-[#A8A29E] hover:text-[#1C1B1A]'
          }`}
          title="Toggle weather warnings along corridor"
        >
          <CloudRain className="w-4 h-4" />
          <span className="hidden sm:inline">Weather</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSafetyLayer(!showSafetyLayer)}
          className={`min-h-[40px] px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
            showSafetyLayer
              ? 'bg-[#0B6B3A]/15 text-[#0B6B3A] dark:text-[#22C55E] border border-[#0B6B3A]/30'
              : 'text-[#5C5A57] dark:text-[#A8A29E] hover:text-[#1C1B1A]'
          }`}
          title="Toggle emergency facilities (hospitals, police, repair)"
        >
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Safety</span>
        </button>

        <button
          type="button"
          onClick={() => setShowStopsLayer(!showStopsLayer)}
          className={`min-h-[40px] px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
            showStopsLayer
              ? 'bg-[#0B6B3A]/15 text-[#0B6B3A] dark:text-[#22C55E] border border-[#0B6B3A]/30'
              : 'text-[#5C5A57] dark:text-[#A8A29E] hover:text-[#1C1B1A]'
          }`}
          title="Toggle fuel, EV chargers, tolls, and rest plazas"
        >
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">Stops</span>
        </button>
      </div>

      {/* Floating Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-[#1B1D1A]/95 backdrop-blur-md border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3 py-1.5 text-sm text-[#5C5A57] dark:text-[#A8A29E] shadow-sm flex items-center gap-3 pointer-events-auto">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#0B6B3A] inline-block" />
          <span className="font-semibold text-[#1C1B1A] dark:text-[#F5F4F0]">Recommended</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#6B7280] inline-block" />
          <span>Alternate</span>
        </span>
      </div>

      {/* Readable 14px Map Attribution */}
      <div className="absolute bottom-3 right-3 z-[400] bg-white/90 dark:bg-[#1B1D1A]/90 backdrop-blur-md border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-2.5 py-1 text-sm text-[#5C5A57] dark:text-[#A8A29E] shadow-sm select-none pointer-events-auto">
        © OpenStreetMap contributors
      </div>
    </div>
  );
};
