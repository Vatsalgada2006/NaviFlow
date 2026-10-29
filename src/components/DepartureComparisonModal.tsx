/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle, CheckCircle2, TrendingDown, RefreshCw } from 'lucide-react';
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

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
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, origin, destination, vehicle, currentDepartureTime, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="departure-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-[#1C1B1A] dark:text-[#F5F4F0]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0B6B3A]/10 text-[#0B6B3A] dark:text-[#22C55E] rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 id="departure-modal-title" className="text-xl font-bold">
                Leave Now vs Later
              </h3>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Live traffic and time-of-day highway congestion comparison
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 text-[#5C5A57] hover:text-[#1C1B1A] dark:text-[#A8A29E] dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-8 h-8 text-[#0B6B3A] dark:text-[#22C55E] animate-spin" />
            <p className="text-base font-medium">Checking live traffic along corridor windows...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {rationale && (
              <div className="p-4 bg-[#0B6B3A]/10 border border-[#0B6B3A]/30 rounded-xl text-sm text-[#0B6B3A] dark:text-[#22C55E] flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{rationale}</span>
              </div>
            )}

            <div className="space-y-3">
              {slots.map((s) => {
                const isWinner = s.isRecommended;
                return (
                  <div
                    key={s.slotId}
                    className={`p-4 rounded-xl border transition-all ${
                      isWinner
                        ? 'bg-[#FAF8F5] dark:bg-[#121311] border-[#0B6B3A] ring-1 ring-[#0B6B3A]'
                        : 'bg-white dark:bg-[#1B1D1A] border-[#E6E2DC] dark:border-[#2E302B]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{s.label}</span>
                        <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                          ({s.departureTimeFormatted})
                        </span>
                      </div>
                      {isWinner && (
                        <span className="px-2.5 py-1 bg-[#F5A524] text-stone-950 text-sm font-bold rounded-md">
                          Recommended
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-1">
                      <div>
                        <span className="text-[#5C5A57] dark:text-[#A8A29E] block">Estimated Duration</span>
                        <span className="font-bold text-base text-[#1C1B1A] dark:text-[#F5F4F0] tabular-nums">
                          {Math.floor(s.durationMinutes / 60)}h {s.durationMinutes % 60}m
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5C5A57] dark:text-[#A8A29E] block">Expected Arrival</span>
                        <span className="font-bold text-base text-[#1C1B1A] dark:text-[#F5F4F0] tabular-nums">
                          {s.etaFormatted}
                        </span>
                      </div>
                    </div>

                    {s.delayMinutes > 0 ? (
                      <div className="mt-2 text-sm text-[#EA580C] font-medium flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4" />
                        <span>+{s.delayMinutes} min traffic congestion delay</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-[#0B6B3A] dark:text-[#22C55E] font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Optimal highway cruising flow</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] w-full py-2.5 bg-[#0B6B3A] hover:bg-[#08522C] text-white rounded-xl text-base font-semibold transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
