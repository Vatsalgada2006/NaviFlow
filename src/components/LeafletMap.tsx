/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RouteCandidate, Coordinates, StopAmenity } from '../types';

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

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [origin.lat || 20.5937, origin.lon || 78.9629],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    // TomTom Map Display API raster tiles via server-side secure proxy with automatic OSM/Carto fallback
    const tileStyle = isDashboardMode ? 'main' : 'night';
    L.tileLayer(`/api/map-tiles/${tileStyle}/{z}/{x}/{y}.png`, {
      attribution:
        '&copy; <a href="https://www.tomtom.com" target="_blank" rel="noreferrer">TomTom</a>, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
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

  // Update Routes, Pins & Stops
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Add Origin Marker
    if (origin.lat && origin.lon) {
      const originIcon = L.divIcon({
        className: 'custom-pin-origin',
        html: `
          <div style="background-color: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const m = L.marker([origin.lat, origin.lon], { icon: originIcon }).addTo(layers);
      m.bindPopup(`<div style="color: #0f172a; font-size: 12px; font-weight: 600;">Origin: ${origin.name}</div>`);
      bounds.extend([origin.lat, origin.lon]);
    }

    // 2. Add Destination Marker
    if (destination.lat && destination.lon) {
      const destIcon = L.divIcon({
        className: 'custom-pin-dest',
        html: `
          <div style="background-color: #ef4444; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);">
            B
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const m = L.marker([destination.lat, destination.lon], { icon: destIcon }).addTo(layers);
      m.bindPopup(`<div style="color: #0f172a; font-size: 12px; font-weight: 600;">Destination: ${destination.name}</div>`);
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
          weight: 9,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layers);

        // Active Polyline
        const line = L.polyline(latlngs, {
          color: '#06b6d4',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layers);

        latlngs.forEach((pt) => bounds.extend(pt));

        line.bindPopup(
          `<div style="color:#0f172a; font-size:12px; font-family:sans-serif;">
            <strong style="color:#0891b2">${cand.name}</strong><br/>
            ${cand.distanceKm} km · ${Math.floor(cand.totalDurationMinutes / 60)}h ${cand.totalDurationMinutes % 60}m · ₹${cand.totalCostInr}
          </div>`
        );
      } else {
        // Alternate route: muted dashed
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
          `<div style="color:#0f172a; font-size:12px; font-family:sans-serif;">
            <strong>${cand.name} (Alternate)</strong><br/>
            ${cand.distanceKm} km · ${Math.floor(cand.totalDurationMinutes / 60)}h ${cand.totalDurationMinutes % 60}m<br/>
            <button style="margin-top:4px; padding:2px 6px; background:#0284c7; color:white; border:none; border-radius:4px; font-size:11px; cursor:pointer;" onclick="window.selectNaviFlowRoute && window.selectNaviFlowRoute('${cand.id}')">Select this route</button>
          </div>`
        );
      }
    });

    // 4. Render Stop Markers for the selected route
    const activeRoute = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];
    if (activeRoute && activeRoute.allStops) {
      // Show stops along corridor
      activeRoute.allStops.slice(0, 25).forEach((stop: StopAmenity) => {
        if (!stop.lat || !stop.lon) return;

        let bgColor = '#f59e0b'; // amber fuel
        let symbol = '⛽';
        let typeLabel = 'Fuel Station';

        if (stop.type === 'ev_charger') {
          bgColor = '#06b6d4'; // teal
          symbol = '⚡';
          typeLabel = `EV Fast Charger (${stop.chargerPowerKw || 50} kW)`;
        } else if (stop.type === 'cng') {
          bgColor = '#10b981'; // emerald
          symbol = 'CNG';
          typeLabel = 'CNG Station';
        } else if (stop.type === 'toll') {
          bgColor = '#eab308';
          symbol = '₹';
          typeLabel = 'FASTag Toll Plaza';
        } else if (stop.type === 'food') {
          bgColor = '#6366f1';
          symbol = '🍽';
          typeLabel = 'Food & Rest';
        }

        const stopIcon = L.divIcon({
          className: 'stop-custom-icon',
          html: `
            <div style="background-color: ${bgColor}; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
              ${symbol}
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon }).addTo(layers);
        marker.bindPopup(`
          <div style="color: #0f172a; font-size: 12px; font-family: sans-serif; max-width: 200px;">
            <div style="font-weight: 700; color: ${bgColor}">${typeLabel}</div>
            <div style="font-weight: 600; margin-top: 2px;">${stop.name}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">
              ${stop.brand ? `Operator: ${stop.brand}<br/>` : ''}
              ${stop.distanceFromOriginKm ? `~${stop.distanceFromOriginKm} km from departure<br/>` : ''}
              ${stop.hasToilets ? '✓ Clean Washrooms ' : ''}
              ${stop.isOpen24x7 ? '✓ Open 24/7' : ''}
            </div>
          </div>
        `);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [origin, destination, candidates, selectedCandidateId, onSelectCandidate]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden border border-slate-800 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />
      <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded px-2.5 py-1 text-[11px] text-slate-300 pointer-events-none">
        TomTom Map Display &middot; Traffic Engine
      </div>
    </div>
  );
};
