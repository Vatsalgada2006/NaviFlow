/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X, Compass, ShieldCheck, Zap, Fuel, Navigation } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-[#1C1B1A] dark:text-[#F5F4F0]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B6B3A] flex items-center justify-center text-white font-black shadow-sm">
              <Compass className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 id="about-modal-title" className="text-xl font-bold">About NaviFlow</h3>
              <p className="text-sm text-[#0B6B3A] dark:text-[#22C55E] font-medium">India Journey Decision Layer</p>
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

        {/* Vision statement */}
        <div className="p-4 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-[#0B6B3A] dark:text-[#22C55E]">The Decision Layer for Indian Roads</h4>
          <p className="text-base text-[#1C1B1A] dark:text-[#F5F4F0] leading-relaxed">
            Standard maps apps give lines on a map; toll calculators give toll fees; EV apps list chargers. <strong className="font-bold">NaviFlow combines them all into ONE explained, actionable plan tailored for your specific vehicle:</strong> &quot;Route B: 9 min slower, ₹250 cheaper, better stops, and why.&quot;
          </p>
        </div>

        {/* Feature Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-1">
            <div className="font-bold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2">
              <Fuel className="w-4 h-4 text-[#B45309] dark:text-[#F5A524]" />
              <span>Fuel &amp; Energy Intelligence</span>
            </div>
            <p className="text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
              State-specific retail prices for Petrol, Diesel, CNG, and ₹/kWh EV fast charging.
            </p>
          </div>

          <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-1">
            <div className="font-bold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>EV Range Buffer Assurance</span>
            </div>
            <p className="text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
              Pinpoints lowest buffer point along the highway corridor, scheduling verified 50kW+ chargers before reserve limits.
            </p>
          </div>

          <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-1">
            <div className="font-bold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Zero Fake Ratings</span>
            </div>
            <p className="text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
              Evaluates objective facility presence (clean washrooms, 24/7 dining, lighting, secure parking) rather than unverified reviews.
            </p>
          </div>

          <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-1">
            <div className="font-bold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Safety &amp; Corridor Weather</span>
            </div>
            <p className="text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
              Live radar precipitation/heat alerts, along with 24/7 highway patrol chowkis, hospitals, and tyre repair points.
            </p>
          </div>
        </div>

        <div className="text-sm text-[#5C5A57] dark:text-[#A8A29E] border-t border-[#E6E2DC] dark:border-[#2E302B] pt-3 flex items-center justify-between">
          <span>Crafted for Indian drivers across national highway corridors.</span>
          <span className="font-mono font-semibold">v1.0.0-PROD</span>
        </div>

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
