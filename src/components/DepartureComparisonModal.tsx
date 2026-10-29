/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle, CheckCircle2, TrendingDown, RefreshCw, Car } from 'lucide-react';
import { Coordinates, VehiclePreset, DepartureTimeSlot } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  origin: Coordinates;
  destination: Coordinates;
  vehicle: VehiclePreset;
  currentDepartureTime: string;
}

export const DepartureComparisonModal: React.FC<Props> = ({
  isOpen,
  onClose,
  origin,
  destination,
  vehicle,
  currentDepartureTime,
}) => {
  const [slots, setSlots] = useState<DepartureTimeSlot[]>([]);
  const [recommendedId, setRecommendedId] = useState<string>('');
  const [rationale, setRationale] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch('/api/departures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        destination,
        vehicle,
        departureTime: currentDepartureTime,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setSlots(data.slots || []);
          setRecommendedId(data.recommendedSlotId || '');
          setRationale(data.rationale || '');
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to compare departure times.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, origin, destination, vehicle, currentDepartureTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Leave Now vs Later</h3>
              <p className="text-xs text-slate-400">TomTom live &amp; time-of-day highway congestion forecast</p>
            </div>
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

        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mx-auto" />
            <p className="text-xs text-slate-300 font-medium">
              Simulating traffic profiles for 3 departure windows...
            </p>
            <p className="text-[11px] text-slate-500">Evaluating TomTom historical &amp; live congestion matrices</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
              }}
              className="px-2 py-1 bg-red-800 rounded font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Rationale Banner */}
            {rationale && (
              <div className="p-3 bg-teal-950/40 border border-teal-500/40 rounded-xl text-xs text-teal-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-teal-300">Recommendation:</strong> {rationale}
                </div>
              </div>
            )}

            {/* Slots List */}
            <div className="space-y-3">
              {slots.map((slot) => {
                const isRec = slot.slotId === recommendedId || slot.isRecommended;
                const hours = Math.floor(slot.durationMinutes / 60);
                const mins = slot.durationMinutes % 60;

                return (
                  <div
                    key={slot.slotId}
                    className={`p-4 rounded-xl border transition-all ${
                      isRec
                        ? 'bg-slate-900 border-teal-500/70 shadow-lg shadow-teal-500/5 ring-1 ring-teal-500/30'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-white">{slot.label}</span>
                        <span className="text-xs text-slate-400 font-mono">({slot.departureTimeFormatted})</span>
                        {isRec && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full uppercase tracking-wider">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-white tabular-nums">
                          {hours}h {mins}m
                        </div>
                        <div className="text-[11px] text-slate-400">ETA: ~{slot.etaFormatted}</div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className={`text-[11px] ${slot.delayMinutes > 15 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {slot.trafficSummary}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Source: {slot.source}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              On-demand departure comparison queries TomTom live traffic data cached for 1 hour.
            </p>
          </div>
        )}

        <div className="text-right pt-2">
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
