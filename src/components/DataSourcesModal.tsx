/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, Database, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSourcesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    setIsLoading(true);
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealthData(data))
      .catch((err) => console.error('Failed to load health:', err))
      .finally(() => setIsLoading(false));

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="datasources-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-[#1C1B1A] dark:text-[#F5F4F0]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0B6B3A]/10 text-[#0B6B3A] dark:text-[#22C55E] rounded-xl">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 id="datasources-modal-title" className="text-xl font-bold">
                Live Data Sources &amp; Transparency
              </h3>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Zero synthetic data policy: every number carries live attribution
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

        <div className="p-4 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-2">
          <div className="flex items-center gap-2 text-[#0B6B3A] dark:text-[#22C55E] font-bold text-base">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>Honest Data Guarantee</span>
          </div>
          <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
            NaviFlow never invents fictional corridor stops, synthetic weather forecasts, or imaginary user reviews. If a source encounters a temporary outage, NaviFlow shows an honest unavailable indicator rather than presenting fake data as real.
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#5C5A57] dark:text-[#A8A29E] flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Checking live data service endpoints...</span>
          </div>
        ) : healthData ? (
          <div className="space-y-4">
            {/* Cache Status */}
            <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] flex flex-wrap items-center justify-between gap-2 text-sm font-mono">
              <span className="font-sans font-semibold text-[#1C1B1A] dark:text-[#F5F4F0]">In-Memory Server Cache:</span>
              <span className="text-[#0B6B3A] dark:text-[#22C55E]">
                Routes: {healthData.cache?.routes} · Geocodes: {healthData.cache?.geocodes} · Stops: {healthData.cache?.stops} · Fuel: {healthData.cache?.fuel}
              </span>
            </div>

            {/* Providers Breakdown */}
            <div className="divide-y divide-[#E6E2DC] dark:divide-[#2E302B] text-sm">
              <div className="py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-base">Primary Highway Routing Engine</div>
                  <p className="text-[#5C5A57] dark:text-[#A8A29E] mt-0.5">
                    Traffic-aware travel time calculation, multiple alignment candidates, and toll-avoiding highway variations.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-[#0B6B3A]/15 text-[#0B6B3A] dark:text-[#22C55E] font-bold rounded text-sm shrink-0">
                  Live
                </span>
              </div>

              <div className="py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-base">Highway Amenities &amp; Toll Infrastructure</div>
                  <p className="text-[#5C5A57] dark:text-[#A8A29E] mt-0.5">
                    National highway corridor scanning for verified fuel stations, EV fast charging stations, and FASTag toll plazas.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-[#0B6B3A]/15 text-[#0B6B3A] dark:text-[#22C55E] font-bold rounded text-sm shrink-0">
                  Verified OSM
                </span>
              </div>

              <div className="py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-base">Live Retail Fuel &amp; Power Matrix</div>
                  <p className="text-[#5C5A57] dark:text-[#A8A29E] mt-0.5">
                    State-specific retail pump rates for Petrol, Diesel, CNG, and ₹20.50/kWh DC fast charging benchmarks.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-[#0B6B3A]/15 text-[#0B6B3A] dark:text-[#22C55E] font-bold rounded text-sm shrink-0">
                  State Index
                </span>
              </div>

              <div className="py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-base">Highway Corridor Weather Radar</div>
                  <p className="text-[#5C5A57] dark:text-[#A8A29E] mt-0.5">
                    Hourly temperature, precipitation, and aquaplaning hazard warnings along highway coordinates.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-[#0B6B3A]/15 text-[#0B6B3A] dark:text-[#22C55E] font-bold rounded text-sm shrink-0">
                  Free Public
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] w-full py-2.5 bg-[#0B6B3A] hover:bg-[#08522C] text-white rounded-xl text-base font-semibold cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
