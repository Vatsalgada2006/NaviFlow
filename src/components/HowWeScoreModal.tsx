/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X, ShieldAlert, CheckCircle, Scale, Fuel, Zap, Clock, IndianRupee } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HowWeScoreModal: React.FC<Props> = ({ isOpen, onClose }) => {
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
      aria-labelledby="scoring-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-[#1C1B1A] dark:text-[#F5F4F0]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0B6B3A]/10 text-[#0B6B3A] dark:text-[#22C55E] rounded-xl">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h3 id="scoring-modal-title" className="text-xl font-bold">
                How We Decided
              </h3>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Transparent weighted scoring across real highway metrics
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

        {/* Section 1: Objective Facility Verification */}
        <div className="p-4 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-3">
          <div className="flex items-center gap-2 text-[#B45309] dark:text-[#F5A524] font-semibold text-base">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>Zero Synthetic Ratings Policy</span>
          </div>
          <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
            Unlike apps that fabricate 5-star ratings or invent fictional rest stops, NaviFlow calculates an objective <strong className="text-[#1C1B1A] dark:text-[#F5F4F0]">Stop Quality Score (0–1.0)</strong> based strictly on verified highway amenities and operational tags.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-sm text-[#1C1B1A] dark:text-[#F5F4F0]">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E] shrink-0" />
              <span>Clean Verified Washrooms (+15%)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E] shrink-0" />
              <span>Food Plaza / Dining (+15%)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E] shrink-0" />
              <span>24/7 Operating Hours (+15%)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E] shrink-0" />
              <span>Secure Parking Facilities (+10%)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E] shrink-0" />
              <span>COCO Company-Owned Pumps (+10%)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E] shrink-0" />
              <span>EV Fast Charger ≥50kW (+25%)</span>
            </div>
          </div>
        </div>

        {/* Section 2: Transparent Scoring Policies */}
        <div className="space-y-3">
          <h4 className="text-base font-bold text-[#0B6B3A] dark:text-[#22C55E]">
            Transparent Scoring Policies
          </h4>
          <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
            Candidate routes are normalized against the fastest and most affordable options, then evaluated via transparent weighted scoring:
          </p>

          <div className="space-y-3 text-sm">
            {/* Fast Policy */}
            <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
              <div className="flex justify-between items-center text-[#1C1B1A] dark:text-[#F5F4F0] font-bold mb-1">
                <span>Fast Journey Policy</span>
                <span className="px-2 py-0.5 bg-[#0B6B3A]/15 text-[#0B6B3A] dark:text-[#22C55E] rounded text-sm font-semibold">
                  Default
                </span>
              </div>
              <div className="text-sm text-[#5C5A57] dark:text-[#A8A29E] font-mono">
                Score = (0.50 × Time) + (0.20 × Cost) + (0.15 × Comfort) + (0.15 × Stops)
              </div>
            </div>

            {/* Cheap Policy */}
            <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
              <div className="flex justify-between items-center text-[#1C1B1A] dark:text-[#F5F4F0] font-bold mb-1">
                <span>Cheap Journey Policy</span>
                <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">Toll &amp; Fuel Optimization</span>
              </div>
              <div className="text-sm text-[#5C5A57] dark:text-[#A8A29E] font-mono">
                Score = (0.20 × Time) + (0.50 × Cost) + (0.15 × Comfort) + (0.15 × Stops)
              </div>
            </div>

            {/* Comfort Policy */}
            <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
              <div className="flex justify-between items-center text-[#1C1B1A] dark:text-[#F5F4F0] font-bold mb-1">
                <span>Comfort Journey Policy</span>
                <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">Expressway &amp; Rest Amenities</span>
              </div>
              <div className="text-sm text-[#5C5A57] dark:text-[#A8A29E] font-mono">
                Score = (0.20 × Time) + (0.20 × Cost) + (0.30 × Comfort) + (0.30 × Stops)
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] w-full py-2.5 bg-[#0B6B3A] hover:bg-[#08522C] text-white rounded-xl text-base font-semibold transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
